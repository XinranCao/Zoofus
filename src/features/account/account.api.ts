import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { deleteObject, listAll, ref } from "firebase/storage";
import { deletePage, listPages } from "@/features/pages/pages.api";
import { fetchProfile } from "@/features/profile/profile.api";
import { deleteSticker, listStickers } from "@/features/stickers/library/stickers.api";
import { db, storage } from "@/lib/firebase";
import { buildExport, type AccountExport } from "./account.export";

export async function exportAccountData(uid: string): Promise<AccountExport> {
  const [profile, stickers, pages] = await Promise.all([
    fetchProfile(uid),
    listStickers(uid),
    listPages(uid),
  ]);
  return buildExport({ profile, stickers, pages });
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

/** Remove every file under a Storage folder, including orphans with no Firestore document. */
async function deleteFolder(path: string) {
  const { items, prefixes } = await listAll(ref(storage, path));
  await Promise.all(items.map((item) => deleteObject(item)));
  await Promise.all(prefixes.map((prefix) => deleteFolder(prefix.fullPath)));
}

/** Deletes all of the user's data, then the Firebase Auth account itself. Not reversible. */
export async function deleteAccount(user: User): Promise<void> {
  const uid = user.uid;
  const [stickers, pages] = await Promise.all([listStickers(uid), listPages(uid)]);
  await Promise.all(stickers.map((s) => deleteSticker(uid, s)));
  await Promise.all(pages.map((p) => deletePage(uid, p.id)));
  await deleteFolder(`${uid}/stickers`);
  await deleteFolder(`${uid}/profile/profile_pic`);
  await deleteDoc(doc(db, "users", uid));
  await deleteUser(user);
}
