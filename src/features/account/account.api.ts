import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import {
  deleteCollection,
  listCollections,
} from "@/features/collections/collections.api";
import { deleteJournal, listJournals } from "@/features/journal/journal.api";
import { deleteTape, listTapes } from "@/features/tape/tape.api";
import { fetchProfile } from "@/features/profile/profile.api";
import { deleteSticker, listStickers } from "@/features/stickers/library/stickers.api";
import {
  cancelRequest,
  declineRequest,
  dismissShare,
  listFriends,
  listIncoming,
  listInbox,
  listSent,
  listSentShares,
  removeFriend,
  removePublicProfile,
} from "@/features/social/social.api";
import { unshare } from "@/features/social/share.api";
import { cleanFinishedShares } from "@/features/social/social.api";
import {
  declineInvite,
  deleteWorkspace,
  leaveWorkspace,
  listWorkspaces,
} from "@/features/together/workspace.api";
import { ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { deleteFileIfExists, deleteFolder } from "@/lib/storage";
import { buildExport, type AccountExport } from "./account.export";

export async function exportAccountData(uid: string): Promise<AccountExport> {
  const [profile, stickers, tapes, journals, collections] = await Promise.all([
    fetchProfile(uid),
    listStickers(uid),
    listTapes(uid),
    listJournals(uid),
    listCollections(uid),
  ]);
  return buildExport({ profile, stickers, tapes, journals, collections });
}

export const usesPassword = (user: User) =>
  user.providerData.some((p) => p.providerId === EmailAuthProvider.PROVIDER_ID);

/** Deleting an account needs a recent sign-in: confirm identity before touching any data. */
export async function reauthenticate(user: User, password?: string): Promise<void> {
  if (usesPassword(user)) {
    if (!user.email || !password) throw new Error("Password required");
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password),
    );
  } else {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
  }
}

/** Deletes all of the user's data, then the Firebase Auth account itself. Not reversible. */
export async function deleteAccount(user: User): Promise<void> {
  const uid = user.uid;
  const [stickers, tapes, journals, collections] = await Promise.all([
    listStickers(uid),
    listTapes(uid),
    listJournals(uid),
    listCollections(uid),
  ]);
  await Promise.all(stickers.map((s) => deleteSticker(uid, s)));
  await Promise.all(tapes.map((t) => deleteTape(uid, t.id)));
  await Promise.all(journals.map((j) => deleteJournal(uid, j.id)));
  await Promise.all(collections.map((c) => deleteCollection(uid, c.id)));
  await removeSocial(uid);
  await deleteFolder(`${uid}/stickers`);
  await deleteFolder(`${uid}/journals`);
  await deleteFolder(`${uid}/shares`);
  await deleteFolder(`${uid}/collab`);
  await deleteFolder(`${uid}/profile/profile_pic`);
  await deleteDoc(doc(db, "users", uid));
  await deleteUser(user);
}

/** Friends, requests, shares, shared pages and the public profile: everything that points at other people. */
async function removeSocial(uid: string): Promise<void> {
  const [friends, incoming, sentReq, inbox, spaces] = await Promise.all([
    listFriends(uid),
    listIncoming(uid),
    listSent(uid),
    listInbox(uid),
    listWorkspaces(uid),
  ]);
  await Promise.all(
    spaces.mine.map((w) =>
      w.ownerUid === uid ? deleteWorkspace(uid, w.id) : leaveWorkspace(uid, w.id),
    ),
  );
  await Promise.all(spaces.invites.map((w) => declineInvite(uid, w.id)));
  // shares a friend has already finished with: remove their files and markers first
  await cleanFinishedShares(uid, (paths) =>
    Promise.allSettled(paths.map((p) => deleteFileIfExists(ref(storage, p)))).then(
      () => {},
    ),
  ).catch(() => {});
  const stillSent = await listSentShares(uid);
  await Promise.all(stillSent.map((x) => unshare(uid, x.to, x.id, x.files)));
  await Promise.all(inbox.map((x) => dismissShare(uid, x.id)));
  await Promise.all(incoming.map((r) => declineRequest(uid, r.from)));
  await Promise.all(sentReq.map((r) => cancelRequest(uid, r.to)));
  await Promise.all(friends.map((f) => removeFriend(uid, f.uid)));
  await removePublicProfile(uid);
}
