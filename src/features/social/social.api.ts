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
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isCode, makeFriendCode, normalizeCode } from "./friendCode";
import {
  friendDocSchema,
  publicProfileSchema,
  requestDocSchema,
  sentDocSchema,
  shareDocSchema,
  type Friend,
  type FriendRequest,
  type PublicProfile,
  type Share,
} from "./social.schema";

const userDoc = (uid: string, ...path: string[]) =>
  doc(db, "users", uid, ...(path as [string, ...string[]]));
const userCol = (uid: string, name: string) => collection(db, "users", uid, name);

export class SocialError extends Error {
  constructor(
    public code: "not-found" | "self" | "already-friends" | "already-sent" | "bad-code",
  ) {
    super(code);
  }
}

// ---------------------------------------------------------------- public profile

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(db, "publicProfiles", uid));
  if (!snap.exists()) return null;
  const r = publicProfileSchema.safeParse(snap.data());
  return r.success ? r.data : null;
}

export interface PublicFields {
  nickname: string;
  avatarUrl: string;
  avatarKind?: "sticker" | "photo";
}

/**
 * Make sure a person has a public profile and a friend code, and that the profile matches their
 * nickname and picture. Returns the profile. A new code is made once and kept.
 */
export async function ensurePublicProfile(
  uid: string,
  fields: PublicFields,
): Promise<PublicProfile> {
  const current = await getPublicProfile(uid);
  const wanted = {
    nickname: fields.nickname,
    avatarUrl: fields.avatarUrl,
    ...(fields.avatarKind ? { avatarKind: fields.avatarKind } : {}),
  };
  if (current) {
    const same =
      current.nickname === wanted.nickname &&
      current.avatarUrl === wanted.avatarUrl &&
      current.avatarKind === fields.avatarKind;
    if (same) return current;
    await setDoc(doc(db, "publicProfiles", uid), {
      ...wanted,
      friendCode: current.friendCode,
      updatedAt: serverTimestamp(),
    });
    return { ...current, ...wanted };
  }
  // first time: claim a code (retrying if someone else has it), then publish
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = makeFriendCode();
    const taken = await getDoc(doc(db, "friendCodes", code));
    if (taken.exists()) continue;
    const batch = writeBatch(db);
    batch.set(doc(db, "friendCodes", code), { uid });
    batch.set(doc(db, "publicProfiles", uid), {
      ...wanted,
      friendCode: code,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return { ...wanted, avatarUrl: wanted.avatarUrl, friendCode: code } as PublicProfile;
  }
  throw new Error("Could not make a friend code");
}

export async function removePublicProfile(uid: string): Promise<void> {
  const current = await getPublicProfile(uid);
  if (current && isCode(current.friendCode))
    await deleteDoc(doc(db, "friendCodes", current.friendCode));
  await deleteDoc(doc(db, "publicProfiles", uid)).catch(() => {});
}

/** Look someone up by the code they gave. */
export async function findByCode(
  input: string,
): Promise<{ uid: string; profile: PublicProfile }> {
  const code = normalizeCode(input);
  if (!code) throw new SocialError("bad-code");
  const snap = await getDoc(doc(db, "friendCodes", code));
  if (!snap.exists()) throw new SocialError("not-found");
  const uid = (snap.data() as { uid?: string }).uid;
  if (!uid) throw new SocialError("not-found");
  const profile = await getPublicProfile(uid);
  if (!profile) throw new SocialError("not-found");
  return { uid, profile };
}

// ---------------------------------------------------------------- friends and requests

export async function listFriends(me: string): Promise<Friend[]> {
  const snap = await getDocs(userCol(me, "friends"));
  const friends = await Promise.all(
    snap.docs.map(async (d): Promise<Friend | null> => {
      const r = friendDocSchema.safeParse(d.data());
      if (!r.success) return null;
      return {
        uid: d.id,
        alias: r.data.nickname,
        since: r.data.since,
        profile: await getPublicProfile(d.id).catch(() => null),
      };
    }),
  );
  return friends.flatMap((f) => (f ? [f] : []));
}

export async function listIncoming(me: string): Promise<FriendRequest[]> {
  const snap = await getDocs(
    query(userCol(me, "requests"), orderBy("createdAt", "desc")),
  );
  const out = await Promise.all(
    snap.docs.map(async (d): Promise<FriendRequest | null> => {
      const r = requestDocSchema.safeParse(d.data());
      if (!r.success) return null;
      return {
        from: r.data.from,
        createdAt: r.data.createdAt,
        profile: await getPublicProfile(r.data.from).catch(() => null),
      };
    }),
  );
  return out.flatMap((r) => (r ? [r] : []));
}

export async function listSent(
  me: string,
): Promise<{ to: string; createdAt: Date; profile: PublicProfile | null }[]> {
  const snap = await getDocs(
    query(userCol(me, "sentRequests"), orderBy("createdAt", "desc")),
  );
  const out = await Promise.all(
    snap.docs.map(async (d) => {
      const r = sentDocSchema.safeParse(d.data());
      if (!r.success) return null;
      return {
        to: r.data.to,
        createdAt: r.data.createdAt,
        profile: await getPublicProfile(r.data.to).catch(() => null),
      };
    }),
  );
  return out.flatMap((r) => (r ? [r] : []));
}

/** Ask someone to be friends. If they already asked me, this accepts instead. */
export async function sendRequest(me: string, to: string): Promise<"sent" | "accepted"> {
  if (me === to) throw new SocialError("self");
  if ((await getDoc(userDoc(me, "friends", to))).exists())
    throw new SocialError("already-friends");
  if ((await getDoc(userDoc(me, "requests", to))).exists()) {
    await acceptRequest(me, to);
    return "accepted";
  }
  if ((await getDoc(userDoc(me, "sentRequests", to))).exists())
    throw new SocialError("already-sent");
  const batch = writeBatch(db);
  batch.set(userDoc(to, "requests", me), { from: me, createdAt: serverTimestamp() });
  batch.set(userDoc(me, "sentRequests", to), { to, createdAt: serverTimestamp() });
  await batch.commit();
  return "sent";
}

/** Accept: both people's friend documents are written together, and the request goes away. */
export async function acceptRequest(me: string, from: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(userDoc(me, "friends", from), { since: serverTimestamp() });
  batch.set(userDoc(from, "friends", me), { since: serverTimestamp() });
  batch.delete(userDoc(me, "requests", from));
  await batch.commit();
  // their record of the request is theirs to keep, but the person asked may clear it
  await deleteDoc(userDoc(from, "sentRequests", me)).catch(() => {});
}

export async function declineRequest(me: string, from: string): Promise<void> {
  await deleteDoc(userDoc(me, "requests", from));
  await deleteDoc(userDoc(from, "sentRequests", me)).catch(() => {});
}

export async function cancelRequest(me: string, to: string): Promise<void> {
  await deleteDoc(userDoc(to, "requests", me)).catch(() => {});
  await deleteDoc(userDoc(me, "sentRequests", to));
}

export async function removeFriend(me: string, friend: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(userDoc(me, "friends", friend));
  batch.delete(userDoc(friend, "friends", me));
  await batch.commit();
}

export async function setFriendNickname(
  me: string,
  friend: string,
  nickname: string,
): Promise<void> {
  const name = nickname.trim();
  const ref = userDoc(me, "friends", friend);
  const current = (await getDoc(ref)).data() ?? {};
  await setDoc(ref, {
    since: current.since ?? serverTimestamp(),
    ...(name ? { nickname: name } : {}),
  });
}

// ---------------------------------------------------------------- the inbox

export async function listInbox(me: string): Promise<Share[]> {
  const snap = await getDocs(query(userCol(me, "inbox"), orderBy("createdAt", "desc")));
  return snap.docs.flatMap((d) => {
    const r = shareDocSchema.safeParse(d.data());
    return r.success ? [{ id: d.id, ...r.data }] : [];
  });
}

export async function markSeen(me: string, id: string): Promise<void> {
  await updateDoc(userDoc(me, "inbox", id), { seen: true });
}

export async function dismissShare(me: string, id: string): Promise<void> {
  await deleteDoc(userDoc(me, "inbox", id));
}

/** What I have shared, so I can take it back. */
export async function listSentShares(me: string): Promise<
  {
    id: string;
    to: string;
    kind: string;
    name: string;
    files: string[];
    createdAt: Date;
  }[]
> {
  const snap = await getDocs(query(userCol(me, "sent"), orderBy("createdAt", "desc")));
  return snap.docs.flatMap((d) => {
    const x = d.data();
    if (!x.createdAt?.toDate) return [];
    return [
      {
        id: d.id,
        to: x.to as string,
        kind: x.kind as string,
        name: x.name as string,
        files: (x.files as string[]) ?? [],
        createdAt: x.createdAt.toDate() as Date,
      },
    ];
  });
}
