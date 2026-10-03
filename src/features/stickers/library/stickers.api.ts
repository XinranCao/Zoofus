import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
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
  await setDoc(doc(stickersRef(uid), id), {
    name: input.name,
    storagePath,
    imageUrl,
    width: input.width,
    height: input.height,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function deleteSticker(
  uid: string,
  sticker: Pick<Sticker, "id" | "storagePath">,
) {
  await deleteDoc(doc(stickersRef(uid), sticker.id));
  await deleteObject(ref(storage, sticker.storagePath));
}
