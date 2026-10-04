import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { createJournal } from "@/features/journal/journal.api";
import type { Asset, Item, PageSpec } from "@/features/journal/journal.schema";
import type { Sticker } from "@/features/stickers/library/sticker.schema";
import type { TapeSpec } from "@/features/tape/tape.schema";
import { db, storage } from "@/lib/firebase";
import { toInlinePicture } from "@/lib/inlinePicture";
import { deleteFolder, readPicture } from "@/lib/storage";
import { cleanForFirestore } from "@/paper/patternSchema";
import {
  itemFromDoc,
  presenceSchema,
  shelfDocSchema,
  workspaceDocSchema,
  type Presence,
  type ShelfEntry,
  type Workspace,
} from "./workspace.schema";

/** The most a sticker on the shelf may weigh: well under the 1 MiB a document can hold. */
const SHELF_INLINE = { maxSide: 560, maxChars: 150_000 } as const;

const ws = (id: string) => doc(db, "workspaces", id);
const sub = (id: string, name: string) => collection(db, "workspaces", id, name);

export class WorkspaceError extends Error {
  constructor(public code: "full" | "gone" | "not-invited") {
    super(code);
  }
}

const parse = (id: string, data: unknown): Workspace | null => {
  const r = workspaceDocSchema.safeParse(data);
  return r.success ? { id, ...r.data } : null;
};

export async function createWorkspace(
  me: string,
  input: { title: string; page: PageSpec; invite: string[] },
): Promise<string> {
  const id = crypto.randomUUID();
  await setDoc(ws(id), {
    title: input.title,
    ownerUid: me,
    members: [me],
    invited: input.invite,
    page: cleanForFirestore(input.page),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

/** The workspaces I am in, and the ones I am invited to. */
export async function listWorkspaces(
  me: string,
): Promise<{ mine: Workspace[]; invites: Workspace[] }> {
  const [a, b] = await Promise.all([
    getDocs(query(collection(db, "workspaces"), where("members", "array-contains", me))),
    getDocs(query(collection(db, "workspaces"), where("invited", "array-contains", me))),
  ]);
  const read = (s: typeof a) =>
    s.docs.flatMap((d) => {
      const w = parse(d.id, d.data());
      return w ? [w] : [];
    });
  const byRecent = (x: Workspace, y: Workspace) =>
    y.updatedAt.getTime() - x.updatedAt.getTime();
  return { mine: read(a).sort(byRecent), invites: read(b).sort(byRecent) };
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  try {
    const snap = await getDoc(ws(id));
    return snap.exists() ? parse(snap.id, snap.data()) : null;
  } catch {
    return null; // not a member (or gone): the same to the person asking
  }
}

/** Live: the workspace document (who is in, the paper, the title). */
export function watchWorkspace(
  id: string,
  on: (w: Workspace | null) => void,
  fail: () => void,
): Unsubscribe {
  return onSnapshot(
    ws(id),
    (snap) => on(snap.exists() ? parse(snap.id, snap.data()) : null),
    fail,
  );
}

export async function acceptInvite(me: string, id: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ws(id));
    const w = snap.exists() ? parse(id, snap.data()) : null;
    if (!w) throw new WorkspaceError("gone");
    if (!w.invited.includes(me)) throw new WorkspaceError("not-invited");
    if (w.members.length >= 8) throw new WorkspaceError("full");
    tx.update(ws(id), {
      members: [...w.members, me],
      invited: w.invited.filter((u) => u !== me),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function declineInvite(me: string, id: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ws(id));
    const w = snap.exists() ? parse(id, snap.data()) : null;
    if (!w) return;
    tx.update(ws(id), {
      invited: w.invited.filter((u) => u !== me),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function inviteFriends(id: string, uids: string[]): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ws(id));
    const w = snap.exists() ? parse(id, snap.data()) : null;
    if (!w) throw new WorkspaceError("gone");
    const invited = [
      ...new Set([...w.invited, ...uids.filter((u) => !w.members.includes(u))]),
    ];
    tx.update(ws(id), { invited: invited.slice(0, 12), updatedAt: serverTimestamp() });
  });
}

export async function renameWorkspace(id: string, title: string): Promise<void> {
  await updateDoc(ws(id), { title, updatedAt: serverTimestamp() });
}

export async function setWorkspacePage(id: string, page: PageSpec): Promise<void> {
  await updateDoc(ws(id), {
    page: cleanForFirestore(page),
    updatedAt: serverTimestamp(),
  });
}

/** A member (not the owner) leaves; the pictures they brought are taken off the shelf and deleted. */
export async function leaveWorkspace(me: string, id: string): Promise<void> {
  await removeMyShelf(me, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ws(id));
    const w = snap.exists() ? parse(id, snap.data()) : null;
    if (!w) return;
    tx.update(ws(id), {
      members: w.members.filter((u) => u !== me),
      updatedAt: serverTimestamp(),
    });
  });
}

/** The owner ends it: everything on the page and the shelf goes, along with the owner's own pictures. */
export async function deleteWorkspace(me: string, id: string): Promise<void> {
  for (const name of ["items", "assets", "presence"]) {
    const snap = await getDocs(sub(id, name));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(ws(id));
  await deleteFolder(`${me}/collab/${id}`).catch(() => {});
}

async function removeMyShelf(me: string, id: string): Promise<void> {
  const snap = await getDocs(query(sub(id, "assets"), where("owner", "==", me)));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteFolder(`${me}/collab/${id}`).catch(() => {});
}

// ---------------------------------------------------------------- the page, live

/**
 * Listen to the objects on the page. `on` gets what changed since last time (added or changed
 * objects, removed ids); changes this device made itself (still pending) are skipped, since they
 * are already on screen.
 */
export function watchItems(
  id: string,
  on: (changes: { put: Item[]; del: string[] }) => void,
  fail: () => void,
): Unsubscribe {
  return onSnapshot(
    sub(id, "items"),
    (snap) => {
      const put: Item[] = [];
      const del: string[] = [];
      for (const c of snap.docChanges()) {
        if (c.doc.metadata.hasPendingWrites) continue;
        if (c.type === "removed") del.push(c.doc.id);
        else {
          const item = itemFromDoc({ ...c.doc.data(), id: c.doc.id });
          if (item) put.push(item);
        }
      }
      if (put.length || del.length) on({ put, del });
    },
    fail,
  );
}

export async function putItem(wid: string, me: string, item: Item): Promise<void> {
  const { id, ...rest } = item;
  await setDoc(doc(sub(wid, "items"), id), {
    ...cleanForFirestore(rest),
    by: me,
    upd: serverTimestamp(),
  });
}

export async function removeItem(wid: string, id: string): Promise<void> {
  await deleteDoc(doc(sub(wid, "items"), id));
}

export function watchShelf(id: string, on: (shelf: ShelfEntry[]) => void): Unsubscribe {
  return onSnapshot(sub(id, "assets"), (snap) => {
    on(
      snap.docs.flatMap((d) => {
        const r = shelfDocSchema.safeParse(d.data());
        return r.success ? [{ id: d.id, ...r.data } as ShelfEntry] : [];
      }),
    );
  });
}

/**
 * Put one of my stickers on the shelf for everyone to use. Members cannot read each other's files,
 * so the picture goes into the shelf entry itself, shrunk to a size that suits a page. It costs no
 * Storage, and it goes away with the workspace.
 */
export async function addStickerToShelf(
  wid: string,
  me: string,
  sticker: Sticker,
): Promise<string> {
  const pic = await toInlinePicture(sticker.imageUrl, SHELF_INLINE);
  const aid = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await setDoc(doc(sub(wid, "assets"), aid), {
    kind: "sticker",
    owner: me,
    url: pic.url,
    // the shape of the original, so a sticker keeps its proportions
    w: sticker.width,
    h: sticker.height,
    name: sticker.name,
  });
  return aid;
}

export async function addTapeToShelf(
  wid: string,
  me: string,
  name: string,
  tape: Omit<TapeSpec, "name">,
): Promise<string> {
  const aid = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await setDoc(doc(sub(wid, "assets"), aid), {
    kind: "tape",
    owner: me,
    name: name.slice(0, 80),
    tape: cleanForFirestore({
      pattern: tape.pattern,
      thickness: tape.thickness,
      opacity: tape.opacity,
      ends: tape.ends,
    }),
  });
  return aid;
}

export async function removeFromShelf(wid: string, entry: ShelfEntry): Promise<void> {
  await deleteDoc(doc(sub(wid, "assets"), entry.id));
}

// ---------------------------------------------------------------- who is here

export function watchPresence(id: string, on: (people: Presence[]) => void): Unsubscribe {
  return onSnapshot(sub(id, "presence"), (snap) => {
    on(
      snap.docs.flatMap((d) => {
        const r = presenceSchema.safeParse(d.data());
        return r.success ? [{ uid: d.id, ...r.data }] : [];
      }),
    );
  });
}

export async function heartbeat(
  wid: string,
  me: string,
  name: string,
  color: string,
): Promise<void> {
  await setDoc(doc(sub(wid, "presence"), me), {
    name: name.slice(0, 40),
    color,
    ts: serverTimestamp(),
  });
}

export async function leavePresence(wid: string, me: string): Promise<void> {
  await deleteDoc(doc(sub(wid, "presence"), me)).catch(() => {});
}

// ---------------------------------------------------------------- keep a copy

/**
 * Save what is on the shared page as a journal of my own. The pictures it uses are copied into
 * my folder, so my copy stands alone, whatever happens to the workspace.
 */
export async function saveCopy(
  me: string,
  w: Workspace,
  items: Item[],
  shelf: Map<string, ShelfEntry>,
  existing: number,
): Promise<string> {
  const id = crypto.randomUUID();
  const assets: Record<string, Asset> = {};
  const kept: Item[] = [];
  for (const item of items) {
    if (item.t === "s" && item.ref.startsWith("a:")) {
      const aid = item.ref.slice(2);
      const entry = shelf.get(aid);
      if (!entry || entry.kind !== "sticker") continue; // its picture was taken off the shelf
      if (!assets[aid]) {
        // a picture that cannot be read leaves its place empty rather than losing the whole copy
        const raw = await readPicture(entry.url).catch(() => null);
        if (!raw) continue;
        const blob =
          raw.type === "image/png" || raw.type === "image/webp"
            ? raw
            : new Blob([raw], { type: "image/webp" });
        const path = `${me}/journals/${id}/assets/${aid}.${blob.type === "image/png" ? "png" : "webp"}`;
        const r = ref(storage, path);
        await uploadBytes(r, blob, { contentType: blob.type });
        assets[aid] = {
          url: await getDownloadURL(r),
          path,
          w: entry.w,
          h: entry.h,
          name: entry.name,
        };
      }
    }
    kept.push(item);
  }
  return createJournal(
    me,
    {
      id,
      title: w.title,
      page: w.page,
      items: kept,
      assets,
      origin: { workspace: w.id },
    },
    existing,
  );
}
