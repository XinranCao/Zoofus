import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { deleteFileIfExists } from "@/lib/storage";
import { cleanForFirestore } from "@/paper/patternSchema";
import type { EdgeSpec } from "@/paper/renderSticker";
import {
  MAX_STICKER_BYTES,
  MAX_STICKERS,
  StickerLimitError,
  stickerDocSchema,
  stickerKind,
  type Sticker,
} from "./sticker.schema";

/** File extension for a stored image, from its MIME type (WebP preferred, PNG as fallback). */
const extensionFor = (blob: Blob) => (blob.type === "image/webp" ? "webp" : "png");

const stickersRef = (uid: string) => collection(db, "users", uid, "stickers");

/** Reads one sticker document; one unreadable document must never take the whole book down with it. */
function readSticker(id: string, data: DocumentData): Sticker | null {
  const parsed = stickerDocSchema.safeParse(data);
  if (parsed.success)
    return { id, ...parsed.data, kind: stickerKind(parsed.data) } as Sticker;
  // A bad edge only costs the sticker its editability: show it as a plain, baked sticker.
  const {
    edge: _edge,
    seed: _seed,
    sourcePath: _sp,
    sourceUrl: _su,
    outline: _ol,
    cut: _cut,
    ...rest
  } = data;
  const plain = stickerDocSchema.safeParse(rest);
  if (plain.success) return { id, ...plain.data, kind: "legacy" } as Sticker;
  console.warn(`Skipping sticker ${id}: its data could not be read`, parsed.error.issues);
  return null;
}

const readAll = (docs: QueryDocumentSnapshot[]): Sticker[] =>
  docs.flatMap((d) => readSticker(d.id, d.data()) ?? []);

/** Every sticker (the picker, collections and the journal's pictures need them all). */
export async function listStickers(uid: string): Promise<Sticker[]> {
  const snap = await getDocs(query(stickersRef(uid), orderBy("createdAt", "desc")));
  return readAll(snap.docs);
}

/** The newest few (the home page shows five of them). */
export async function listRecentStickers(uid: string, count: number): Promise<Sticker[]> {
  const snap = await getDocs(
    query(stickersRef(uid), orderBy("createdAt", "desc"), limit(count)),
  );
  return readAll(snap.docs);
}

export const STICKER_PAGE = 40;

export interface StickerPage {
  stickers: Sticker[];
  /** Where the next page starts; undefined when this was the last. */
  next?: QueryDocumentSnapshot;
}

/** One page of the Library, newest first. */
export async function listStickerPage(
  uid: string,
  after?: QueryDocumentSnapshot,
): Promise<StickerPage> {
  const snap = await getDocs(
    query(
      stickersRef(uid),
      orderBy("createdAt", "desc"),
      ...(after ? [startAfter(after)] : []),
      limit(STICKER_PAGE),
    ),
  );
  return {
    stickers: readAll(snap.docs),
    next: snap.docs.length === STICKER_PAGE ? snap.docs[snap.docs.length - 1] : undefined,
  };
}

/** One sticker by id (a link such as `/stickers?edit=<id>` may point past the first page). */
export async function getSticker(uid: string, id: string): Promise<Sticker | null> {
  const snap = await getDoc(doc(stickersRef(uid), id));
  return snap.exists() ? readSticker(snap.id, snap.data()) : null;
}

export interface NewSticker {
  name: string;
  /** The finished sticker: the cut-out with its edge baked in (what the grid and the PNG show). */
  sticker: Blob;
  /** The edge-less cut-out, kept so "Edit edge" can redo the edge later. Missing for stickers that never had one. */
  source?: Blob;
  /** The lasso outline (text) and where the cut-out sits in the stored picture: replaces `source`. */
  outline?: string;
  cut?: { x: number; y: number; w: number; h: number };
  width: number;
  height: number;
  edge: EdgeSpec;
  seed: string;
  /** The small picture for tiles (see `COMPRESSION.stickerThumb`). */
  thumb?: Blob;
}

async function upload(path: string, blob: Blob): Promise<string> {
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: blob.type });
  return getDownloadURL(fileRef);
}

function assertSize(...blobs: Blob[]) {
  if (blobs.some((b) => b.size > MAX_STICKER_BYTES)) {
    throw new StickerLimitError(
      "This sticker is too large to save. Try a smaller photo.",
      "size",
    );
  }
}

/** Uploads the finished sticker and its edge-less source, then writes the metadata document. */
export async function saveSticker(uid: string, input: NewSticker): Promise<string> {
  assertSize(...(input.source ? [input.sticker, input.source] : [input.sticker]));
  const { count } = (await getCountFromServer(stickersRef(uid))).data();
  if (count >= MAX_STICKERS) {
    throw new StickerLimitError(
      `You can keep up to ${MAX_STICKERS} stickers. Delete some first.`,
      "count",
    );
  }

  const id = crypto.randomUUID();
  const storagePath = `${uid}/stickers/${id}.${extensionFor(input.sticker)}`;
  const sourcePath = input.source
    ? `${uid}/stickers/${id}_src.${extensionFor(input.source)}`
    : undefined;
  const thumbPath = input.thumb ? `${uid}/stickers/${id}_t.webp` : undefined;
  try {
    const [imageUrl, sourceUrl, thumbUrl] = await Promise.all([
      upload(storagePath, input.sticker),
      sourcePath && input.source
        ? upload(sourcePath, input.source)
        : Promise.resolve(undefined),
      thumbPath && input.thumb
        ? upload(thumbPath, input.thumb)
        : Promise.resolve(undefined),
    ]);
    await setDoc(doc(stickersRef(uid), id), {
      name: input.name,
      storagePath,
      imageUrl,
      ...(sourcePath && sourceUrl ? { sourcePath, sourceUrl } : {}),
      ...(thumbPath && thumbUrl ? { thumbPath, thumbUrl } : {}),
      ...(input.outline && input.cut ? { outline: input.outline, cut: input.cut } : {}),
      // only the edge is cleaned: the timestamp below is a sentinel object that must stay intact
      edge: cleanForFirestore(input.edge),
      seed: input.seed,
      width: input.width,
      height: input.height,
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    // Don't leave files behind that no sticker document points at.
    await Promise.allSettled(
      [storagePath, sourcePath, thumbPath].flatMap((p) =>
        p ? [deleteFileIfExists(ref(storage, p))] : [],
      ),
    );
    throw err;
  }
}

export interface EdgeUpdate {
  sticker: Blob;
  width: number;
  height: number;
  edge: EdgeSpec;
  seed: string;
  /** Where the cut-out now sits in the stored picture (stickers that keep an outline). */
  cut?: { x: number; y: number; w: number; h: number };
  /** The small picture for the new edge. */
  thumb?: Blob;
}

/**
 * "Edit edge": uploads the new finished sticker under a new name (so caches never serve the old
 * one), points the document at it, then removes the previous file.
 */
export async function updateStickerEdge(
  uid: string,
  current: Pick<Sticker, "id" | "storagePath" | "thumbPath">,
  input: EdgeUpdate,
): Promise<string> {
  assertSize(input.sticker);
  const stamp = Date.now();
  const storagePath = `${uid}/stickers/${current.id}_${stamp}.${extensionFor(input.sticker)}`;
  const imageUrl = await upload(storagePath, input.sticker);
  const thumbPath = input.thumb
    ? `${uid}/stickers/${current.id}_${stamp}_t.webp`
    : undefined;
  const thumbUrl =
    thumbPath && input.thumb ? await upload(thumbPath, input.thumb) : undefined;
  try {
    await updateDoc(doc(stickersRef(uid), current.id), {
      storagePath,
      imageUrl,
      // the old small picture shows the old edge: replace it, or drop it until one is made again
      thumbPath: thumbPath ?? deleteField(),
      thumbUrl: thumbUrl ?? deleteField(),
      edge: cleanForFirestore(input.edge),
      seed: input.seed,
      width: input.width,
      height: input.height,
      ...(input.cut ? { cut: input.cut } : {}),
    });
  } catch (err) {
    await deleteFileIfExists(ref(storage, storagePath));
    if (thumbPath) await deleteFileIfExists(ref(storage, thumbPath));
    throw err;
  }
  if (current.thumbPath)
    await deleteFileIfExists(ref(storage, current.thumbPath)).catch(() => {});
  // The edge is saved; removing the previous image is housekeeping and must not fail the edit.
  await deleteFileIfExists(ref(storage, current.storagePath)).catch((err) =>
    console.warn("Could not remove the previous image", err),
  );
  return imageUrl; // so the caller can wait until the new picture has loaded
}

export async function deleteSticker(
  uid: string,
  sticker: Pick<
    Sticker,
    "id" | "storagePath" | "sourcePath" | "thumbnailPath" | "thumbPath"
  >,
) {
  await deleteDoc(doc(stickersRef(uid), sticker.id));
  await deleteFileIfExists(ref(storage, sticker.storagePath));
  if (sticker.sourcePath) await deleteFileIfExists(ref(storage, sticker.sourcePath));
  if (sticker.thumbPath) await deleteFileIfExists(ref(storage, sticker.thumbPath));
  if (sticker.thumbnailPath)
    await deleteFileIfExists(ref(storage, sticker.thumbnailPath));
}

export async function renameSticker(uid: string, id: string, name: string) {
  await updateDoc(doc(stickersRef(uid), id), { name });
}

/**
 * Keep a small picture for a sticker saved before they existed (or whose last one was lost):
 * nothing else changes, so its place in the list stays.
 */
export async function setStickerThumb(
  uid: string,
  sticker: Pick<Sticker, "id" | "thumbPath">,
  thumb: Blob,
): Promise<{ thumbPath: string; thumbUrl: string }> {
  const thumbPath = `${uid}/stickers/${sticker.id}_${Date.now()}_t.webp`;
  const thumbUrl = await upload(thumbPath, thumb);
  await updateDoc(doc(stickersRef(uid), sticker.id), { thumbPath, thumbUrl });
  if (sticker.thumbPath && sticker.thumbPath !== thumbPath)
    await deleteFileIfExists(ref(storage, sticker.thumbPath)).catch(() => {});
  return { thumbPath, thumbUrl };
}
