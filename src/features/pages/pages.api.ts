import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_PAGE_SIZE,
  pageDocSchema,
  pageItemSchema,
  type Page,
  type PageItem,
} from "./page.schema";

const pagesRef = (uid: string) => collection(db, "users", uid, "pages");

export async function listPages(uid: string): Promise<Page[]> {
  const snap = await getDocs(query(pagesRef(uid), orderBy("updatedAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...pageDocSchema.parse(d.data()) }));
}

export async function getPage(uid: string, id: string): Promise<Page | null> {
  const snap = await getDoc(doc(pagesRef(uid), id));
  return snap.exists() ? { id: snap.id, ...pageDocSchema.parse(snap.data()) } : null;
}

export async function createPage(uid: string, title: string): Promise<string> {
  const id = crypto.randomUUID();
  await setDoc(doc(pagesRef(uid), id), {
    title,
    ...DEFAULT_PAGE_SIZE,
    background: "plain",
    items: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export interface PageChanges {
  title?: string;
  background?: string;
  items?: PageItem[];
}

export async function savePage(
  uid: string,
  id: string,
  changes: PageChanges,
): Promise<void> {
  // Validate before writing so a bug can never persist a malformed page.
  if (changes.items) changes.items.forEach((item) => pageItemSchema.parse(item));
  await updateDoc(doc(pagesRef(uid), id), { ...changes, updatedAt: serverTimestamp() });
}

export async function deletePage(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(pagesRef(uid), id));
}
