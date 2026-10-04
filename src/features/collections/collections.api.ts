import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  collectionDocSchema,
  MAX_COLLECTIONS,
  type Collection,
  type CollectionItem,
} from "./collection.schema";

const ref = (uid: string) => collection(db, "users", uid, "collections");

export class CollectionLimitError extends Error {}

export async function listCollections(uid: string): Promise<Collection[]> {
  const snap = await getDocs(query(ref(uid), orderBy("updatedAt", "desc")));
  const out: Collection[] = [];
  for (const d of snap.docs) {
    const parsed = collectionDocSchema.safeParse(d.data());
    if (parsed.success) out.push({ id: d.id, ...parsed.data });
    else console.warn(`Skipping collection ${d.id}`, parsed.error.issues);
  }
  return out;
}

export async function createCollection(
  uid: string,
  name: string,
  items: CollectionItem[] = [],
  existing = 0,
): Promise<string> {
  if (existing >= MAX_COLLECTIONS) throw new CollectionLimitError();
  const id = crypto.randomUUID();
  await setDoc(doc(ref(uid), id), {
    name,
    items,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function renameCollection(uid: string, id: string, name: string) {
  await updateDoc(doc(ref(uid), id), { name, updatedAt: serverTimestamp() });
}

export async function addToCollection(uid: string, id: string, items: CollectionItem[]) {
  if (items.length === 0) return;
  await updateDoc(doc(ref(uid), id), {
    items: arrayUnion(...items),
    updatedAt: serverTimestamp(),
  });
}

export async function removeFromCollection(
  uid: string,
  id: string,
  items: CollectionItem[],
) {
  if (items.length === 0) return;
  await updateDoc(doc(ref(uid), id), {
    items: arrayRemove(...items),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCollection(uid: string, id: string) {
  await deleteDoc(doc(ref(uid), id));
}

/** A sticker, tape or journal was deleted: it leaves every collection it was in. */
export async function removeFromAllCollections(uid: string, item: CollectionItem) {
  const snap = await getDocs(query(ref(uid), where("items", "array-contains", item)));
  await Promise.all(
    snap.docs.map((d) =>
      updateDoc(d.ref, { items: arrayRemove(item), updatedAt: serverTimestamp() }),
    ),
  );
}
