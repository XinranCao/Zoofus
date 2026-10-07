import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { deleteFileIfExists, deleteFolder } from "@/lib/storage";
import { cleanForFirestore } from "@/paper/patternSchema";
import {
  journalDocSchema,
  MAX_JOURNAL_ITEMS,
  type Asset,
  type Item,
  type Journal,
  type PageSpec,
} from "./journal.schema";

const journalsRef = (uid: string) => collection(db, "users", uid, "journals");

export class JournalLimitError extends Error {}
export const MAX_JOURNALS = 200;

const parse = (id: string, data: unknown): Journal | null => {
  const r = journalDocSchema.safeParse(data);
  if (r.success) return { id, ...r.data };
  console.warn(`Skipping journal ${id}: its data could not be read`, r.error.issues);
  return null;
};

export async function listJournals(uid: string): Promise<Journal[]> {
  const snap = await getDocs(query(journalsRef(uid), orderBy("updatedAt", "desc")));
  return snap.docs.flatMap((d) => {
    const j = parse(d.id, d.data());
    return j ? [j] : [];
  });
}

/** How many journals there are, counted by the server (one read for up to 1,000, no documents sent). */
export async function countJournals(uid: string): Promise<number> {
  return (await getCountFromServer(journalsRef(uid))).data().count;
}

export async function getJournal(uid: string, id: string): Promise<Journal | null> {
  const snap = await getDoc(doc(journalsRef(uid), id));
  return snap.exists() ? parse(snap.id, snap.data()) : null;
}

export interface NewJournal {
  title: string;
  page: PageSpec;
  items?: Item[];
  assets?: Record<string, Asset>;
  origin?: { from?: string; workspace?: string };
  /** Use this id (when files for the journal were already stored under it). */
  id?: string;
  thumbUrl?: string;
  thumbPath?: string;
}

export async function createJournal(
  uid: string,
  input: NewJournal,
  existing = 0,
): Promise<string> {
  if (existing >= MAX_JOURNALS) throw new JournalLimitError();
  const items = input.items ?? [];
  if (items.length > MAX_JOURNAL_ITEMS) throw new JournalLimitError();
  const id = input.id ?? crypto.randomUUID();
  await setDoc(doc(journalsRef(uid), id), {
    title: input.title,
    page: cleanForFirestore(input.page),
    items: cleanForFirestore(items),
    ...(input.assets && Object.keys(input.assets).length
      ? { assets: cleanForFirestore(input.assets) }
      : {}),
    ...(input.thumbUrl && input.thumbPath
      ? { thumbUrl: input.thumbUrl, thumbPath: input.thumbPath }
      : {}),
    ...(input.origin ? { origin: cleanForFirestore(input.origin) } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export interface JournalChanges {
  title?: string;
  page?: PageSpec;
  items?: Item[];
  /** A new thumbnail (WebP). It replaces the previous one. */
  thumb?: Blob | null;
}

/** What a save tells the caller: the new picture, if one was made. */
export interface SavedJournal {
  thumbPath?: string;
  thumbUrl?: string;
}

export async function saveJournal(
  uid: string,
  journal: Pick<Journal, "id" | "thumbPath">,
  changes: JournalChanges,
): Promise<SavedJournal> {
  if (changes.items && changes.items.length > MAX_JOURNAL_ITEMS)
    throw new JournalLimitError();
  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (changes.title !== undefined) update.title = changes.title;
  if (changes.page) update.page = cleanForFirestore(changes.page);
  if (changes.items) update.items = cleanForFirestore(changes.items);
  let newThumbPath: string | undefined;
  let newThumbUrl: string | undefined;
  if (changes.thumb) {
    // a new name every time, so a cached picture is never served for the new page
    newThumbPath = `${uid}/journals/${journal.id}/thumb_${Date.now()}.webp`;
    const fileRef = ref(storage, newThumbPath);
    await uploadBytes(fileRef, changes.thumb, { contentType: "image/webp" });
    newThumbUrl = await getDownloadURL(fileRef);
    update.thumbUrl = newThumbUrl;
    update.thumbPath = newThumbPath;
  }
  await updateDoc(doc(journalsRef(uid), journal.id), update);
  if (newThumbPath && journal.thumbPath && journal.thumbPath !== newThumbPath)
    await deleteFileIfExists(ref(storage, journal.thumbPath)).catch(() => {});
  // the caller keeps the path, so the next save knows what to replace; the list patches its copy
  return { thumbPath: newThumbPath, thumbUrl: newThumbUrl };
}

/**
 * Keep a picture of the page without touching anything else (not even its "updated" time, so the
 * list does not reorder): for a journal that was saved before its picture could be made.
 */
export async function setJournalThumb(
  uid: string,
  journal: Pick<Journal, "id" | "thumbPath">,
  thumb: Blob,
): Promise<{ thumbPath: string; thumbUrl: string }> {
  const path = `${uid}/journals/${journal.id}/thumb_${Date.now()}.webp`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, thumb, { contentType: "image/webp" });
  const url = await getDownloadURL(fileRef);
  await updateDoc(doc(journalsRef(uid), journal.id), { thumbUrl: url, thumbPath: path });
  if (journal.thumbPath && journal.thumbPath !== path)
    await deleteFileIfExists(ref(storage, journal.thumbPath)).catch(() => {});
  return { thumbPath: path, thumbUrl: url };
}

export async function renameJournal(uid: string, id: string, title: string) {
  await updateDoc(doc(journalsRef(uid), id), { title, updatedAt: serverTimestamp() });
}

/** Deletes the journal and every file it owns (its thumbnail and any pictures kept inside it). */
export async function deleteJournal(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(journalsRef(uid), id));
  await deleteFolder(`${uid}/journals/${id}`).catch((err) =>
    console.warn("Could not remove a journal's files", err),
  );
}
