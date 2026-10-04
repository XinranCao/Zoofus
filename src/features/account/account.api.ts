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
import { db } from "@/lib/firebase";
import { deleteFolder } from "@/lib/storage";
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
  await deleteFolder(`${uid}/stickers`);
  await deleteFolder(`${uid}/journals`);
  await deleteFolder(`${uid}/shares`);
  await deleteFolder(`${uid}/collab`);
  await deleteFolder(`${uid}/profile/profile_pic`);
  await deleteDoc(doc(db, "users", uid));
  await deleteUser(user);
}
