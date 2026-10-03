import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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

export async function listStickers(uid: string): Promise<Sticker[]> {
  const snap = await getDocs(query(stickersRef(uid), orderBy("createdAt", "desc")));
  const stickers: Sticker[] = [];
  for (const d of snap.docs) {
    // One unreadable document must never take the whole book down with it.
    const parsed = stickerDocSchema.safeParse(d.data());
    if (parsed.success) {
      stickers.push({
        id: d.id,
        ...parsed.data,
        kind: stickerKind(parsed.data),
      } as Sticker);
      continue;
    }
    // A bad edge only costs the sticker its editability: show it as a plain, baked sticker.
    const {
      edge: _edge,
      seed: _seed,
      sourcePath: _sp,
      sourceUrl: _su,
      ...rest
    } = d.data();
    const plain = stickerDocSchema.safeParse(rest);
    if (plain.success)
      stickers.push({ id: d.id, ...plain.data, kind: "legacy" } as Sticker);
    else
      console.warn(
        `Skipping sticker ${d.id}: its data could not be read`,
        parsed.error.issues,
      );
  }
  return stickers;
}

export interface NewSticker {
  name: string;
  /** The finished sticker: the cut-out with its edge baked in (what the grid and the PNG show). */
  sticker: Blob;
  /** The edge-less cut-out, kept so "Edit edge" can redo the edge later. */
  source: Blob;
  width: number;
  height: number;
  edge: EdgeSpec;
  seed: string;
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
  assertSize(input.sticker, input.source);
  const { count } = (await getCountFromServer(stickersRef(uid))).data();
  if (count >= MAX_STICKERS) {
    throw new StickerLimitError(
      `You can keep up to ${MAX_STICKERS} stickers. Delete some first.`,
      "count",
    );
  }

  const id = crypto.randomUUID();
  const storagePath = `${uid}/stickers/${id}.${extensionFor(input.sticker)}`;
  const sourcePath = `${uid}/stickers/${id}_src.${extensionFor(input.source)}`;
  try {
    const [imageUrl, sourceUrl] = await Promise.all([
      upload(storagePath, input.sticker),
      upload(sourcePath, input.source),
    ]);
    await setDoc(doc(stickersRef(uid), id), {
      name: input.name,
      storagePath,
      imageUrl,
      sourcePath,
      sourceUrl,
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
      [storagePath, sourcePath].map((p) => deleteFileIfExists(ref(storage, p))),
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
}

/**
 * "Edit edge": uploads the new finished sticker under a new name (so caches never serve the old
 * one), points the document at it, then removes the previous file.
 */
export async function updateStickerEdge(
  uid: string,
  current: Pick<Sticker, "id" | "storagePath">,
  input: EdgeUpdate,
): Promise<void> {
  assertSize(input.sticker);
  const storagePath = `${uid}/stickers/${current.id}_${Date.now()}.${extensionFor(input.sticker)}`;
  const imageUrl = await upload(storagePath, input.sticker);
  try {
    await updateDoc(doc(stickersRef(uid), current.id), {
      storagePath,
      imageUrl,
      edge: cleanForFirestore(input.edge),
      seed: input.seed,
      width: input.width,
      height: input.height,
    });
  } catch (err) {
    await deleteFileIfExists(ref(storage, storagePath));
    throw err;
  }
  await deleteFileIfExists(ref(storage, current.storagePath));
}

export async function deleteSticker(
  uid: string,
  sticker: Pick<Sticker, "id" | "storagePath" | "sourcePath" | "thumbnailPath">,
) {
  await deleteDoc(doc(stickersRef(uid), sticker.id));
  await deleteFileIfExists(ref(storage, sticker.storagePath));
  if (sticker.sourcePath) await deleteFileIfExists(ref(storage, sticker.sourcePath));
  if (sticker.thumbnailPath)
    await deleteFileIfExists(ref(storage, sticker.thumbnailPath));
}

export async function renameSticker(uid: string, id: string, name: string) {
  await updateDoc(doc(stickersRef(uid), id), { name });
}
