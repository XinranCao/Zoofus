import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteField,
  startAfter,
  writeBatch,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { deleteFileIfExists, deleteFolder } from "@/lib/storage";
import { cleanForFirestore } from "@/paper/patternSchema";
import {
  journalDocSchema,
  MAX_JOURNAL_ITEMS,
  type Asset,
  itemsSchema,
  type Item,
  type Journal,
  type PageSpec,
} from "./journal.schema";

const journalsRef = (uid: string) => collection(db, "users", uid, "journals");

/** A journal's items live in their own document, so listing journals never carries them. */
const bodyRef = (uid: string, id: string) =>
  doc(db, "users", uid, "journals", id, "body", "items");

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

/** The most recently edited few (the home page shows two or three, and the one to continue). */
export async function listRecentJournals(uid: string, count: number): Promise<Journal[]> {
  const snap = await getDocs(
    query(journalsRef(uid), orderBy("updatedAt", "desc"), limit(count)),
  );
  return snap.docs.flatMap((d) => {
    const j = parse(d.id, d.data());
    return j ? [j] : [];
  });
}

/** How many journals there are, counted by the server (one read for up to 1,000, no documents sent). */
export async function countJournals(uid: string): Promise<number> {
  return (await getCountFromServer(journalsRef(uid))).data().count;
}

/** The items of a journal: from the journal itself (an older one) or from its own document. */
export async function loadItems(
  uid: string,
  journal: Pick<Journal, "id" | "slim" | "items">,
): Promise<Item[]> {
  if (!journal.slim) return journal.items;
  const snap = await getDoc(bodyRef(uid, journal.id));
  if (!snap.exists()) return [];
  const r = itemsSchema.safeParse(snap.data().items ?? []);
  return r.success ? r.data : [];
}

/** The journal with its items filled in (what the editor, a share or an export needs). */
export async function withItems(uid: string, journal: Journal): Promise<Journal> {
  if (!journal.slim) return journal;
  return { ...journal, items: await loadItems(uid, journal) };
}

export async function getJournal(uid: string, id: string): Promise<Journal | null> {
  const snap = await getDoc(doc(journalsRef(uid), id));
  const j = snap.exists() ? parse(snap.id, snap.data()) : null;
  return j ? withItems(uid, j) : null;
}

/** One page of the list (the Journals screen shows 30 at a time). */
export const JOURNAL_PAGE = 30;

export interface JournalPageResult {
  journals: Journal[];
  cursor: QueryDocumentSnapshot | null;
}

export async function listJournalPage(
  uid: string,
  after: QueryDocumentSnapshot | null,
  size = JOURNAL_PAGE,
): Promise<JournalPageResult> {
  const snap = await getDocs(
    query(
      journalsRef(uid),
      orderBy("updatedAt", "desc"),
      ...(after ? [startAfter(after)] : []),
      limit(size),
    ),
  );
  return {
    journals: snap.docs.flatMap((d) => {
      const j = parse(d.id, d.data());
      return j ? [j] : [];
    }),
    // a short page is the last one
    cursor: snap.docs.length === size ? (snap.docs[snap.docs.length - 1] ?? null) : null,
  };
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
  const batch = writeBatch(db);
  batch.set(doc(journalsRef(uid), id), {
    title: input.title,
    page: cleanForFirestore(input.page),
    itemCount: items.length,
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
  batch.set(bodyRef(uid, id), {
    items: cleanForFirestore(items),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
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
  if (changes.items) {
    update.itemCount = changes.items.length;
    // an older journal still has them in its own document: they move out with this save
    update.items = deleteField();
  }
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
  const batch = writeBatch(db);
  batch.update(doc(journalsRef(uid), journal.id), update);
  if (changes.items)
    batch.set(bodyRef(uid, journal.id), {
      items: cleanForFirestore(changes.items),
      updatedAt: serverTimestamp(),
    });
  await batch.commit();
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
  await deleteDoc(bodyRef(uid, id)).catch(() => {});
  await deleteDoc(doc(journalsRef(uid), id));
  await deleteFolder(`${uid}/journals/${id}`).catch((err) =>
    console.warn("Could not remove a journal's files", err),
  );
}

/**
 * Move an older journal's items out of its own document into `body/items`, so lists stop carrying
 * them. It keeps the "updated" time (the rule `slimOnly()`), so the list does not reorder. The
 * journal is read again first: if it was saved (or moved) meanwhile there is nothing to do.
 * Returns the items that were moved, or null.
 */
export async function slimJournal(uid: string, id: string): Promise<Item[] | null> {
  const snap = await getDoc(doc(journalsRef(uid), id));
  const raw = snap.data();
  if (!raw || !Array.isArray(raw.items)) return null;
  const items = itemsSchema.parse(raw.items);
  const batch = writeBatch(db);
  batch.set(bodyRef(uid, id), {
    items: cleanForFirestore(items),
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(journalsRef(uid), id), {
    items: deleteField(),
    itemCount: items.length,
  });
  await batch.commit();
  return items;
}
