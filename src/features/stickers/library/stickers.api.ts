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
import {
  MAX_STICKER_BYTES,
  MAX_STICKERS,
  StickerLimitError,
  stickerDocSchema,
  type Sticker,
} from "./sticker.schema";

/** File extension for a stored image, from its MIME type (WebP preferred, PNG as fallback). */
const extensionFor = (blob: Blob) => (blob.type === "image/webp" ? "webp" : "png");

const stickersRef = (uid: string) => collection(db, "users", uid, "stickers");

export async function listStickers(uid: string): Promise<Sticker[]> {
  const snap = await getDocs(query(stickersRef(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...stickerDocSchema.parse(d.data()) }));
}

export interface NewSticker {
  blob: Blob;
  thumbnail?: Blob;
  name: string;
  width: number;
  height: number;
}

/** Uploads the PNG to Storage, then writes the metadata document. */
export async function saveSticker(uid: string, input: NewSticker): Promise<string> {
  if (input.blob.size > MAX_STICKER_BYTES) {
    throw new StickerLimitError(
      "This sticker is too large to save. Try a smaller photo.",
    );
  }
  const { count } = (await getCountFromServer(stickersRef(uid))).data();
  if (count >= MAX_STICKERS) {
    throw new StickerLimitError(
      `You can keep up to ${MAX_STICKERS} stickers. Delete some first.`,
    );
  }

  const id = crypto.randomUUID();
  const storagePath = `${uid}/stickers/${id}.${extensionFor(input.blob)}`;
  const thumbnailPath = input.thumbnail
    ? `${uid}/stickers/${id}_thumb.${extensionFor(input.thumbnail)}`
    : undefined;

  try {
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, input.blob, { contentType: input.blob.type });
    const imageUrl = await getDownloadURL(fileRef);

    let thumbnailUrl: string | undefined;
    if (input.thumbnail && thumbnailPath) {
      const thumbRef = ref(storage, thumbnailPath);
      await uploadBytes(thumbRef, input.thumbnail, { contentType: input.thumbnail.type });
      thumbnailUrl = await getDownloadURL(thumbRef);
    }

    await setDoc(doc(stickersRef(uid), id), {
      name: input.name,
      storagePath,
      imageUrl,
      ...(thumbnailPath && thumbnailUrl ? { thumbnailPath, thumbnailUrl } : {}),
      width: input.width,
      height: input.height,
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    // Don't leave files behind that no sticker document points at.
    await Promise.allSettled(
      [storagePath, thumbnailPath]
        .filter((p): p is string => Boolean(p))
        .map((p) => deleteFileIfExists(ref(storage, p))),
    );
    throw err;
  }
}

export async function deleteSticker(
  uid: string,
  sticker: Pick<Sticker, "id" | "storagePath" | "thumbnailPath">,
) {
  await deleteDoc(doc(stickersRef(uid), sticker.id));
  await deleteFileIfExists(ref(storage, sticker.storagePath));
  if (sticker.thumbnailPath)
    await deleteFileIfExists(ref(storage, sticker.thumbnailPath));
}

export async function renameSticker(uid: string, id: string, name: string) {
  await updateDoc(doc(stickersRef(uid), id), { name });
}
