import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { stickerDocSchema, type Sticker } from "./sticker.schema";

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
  const id = crypto.randomUUID();
  const storagePath = `${uid}/stickers/${id}.png`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, input.blob, { contentType: "image/png" });
  const imageUrl = await getDownloadURL(fileRef);

  let thumbnail: { thumbnailPath: string; thumbnailUrl: string } | undefined;
  if (input.thumbnail) {
    const thumbnailPath = `${uid}/stickers/${id}_thumb.png`;
    const thumbRef = ref(storage, thumbnailPath);
    await uploadBytes(thumbRef, input.thumbnail, { contentType: "image/png" });
    thumbnail = { thumbnailPath, thumbnailUrl: await getDownloadURL(thumbRef) };
  }

  await setDoc(doc(stickersRef(uid), id), {
    name: input.name,
    storagePath,
    imageUrl,
    ...thumbnail,
    width: input.width,
    height: input.height,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function deleteSticker(
  uid: string,
  sticker: Pick<Sticker, "id" | "storagePath" | "thumbnailPath">,
) {
  await deleteDoc(doc(stickersRef(uid), sticker.id));
  await deleteObject(ref(storage, sticker.storagePath));
  if (sticker.thumbnailPath) await deleteObject(ref(storage, sticker.thumbnailPath));
}

export async function renameSticker(uid: string, id: string, name: string) {
  await updateDoc(doc(stickersRef(uid), id), { name });
}
