import { updateProfile as updateAuthProfile } from "firebase/auth";
import { deleteField, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { deleteFileIfExists } from "@/lib/storage";
import { safePictureUrl } from "@/lib/trustedUrl";
import { profileSchema, type Profile } from "./profile.schema";

export async function fetchProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return profileSchema.parse(snap.data());
}

export interface SaveProfileInput {
  displayName: string;
  photo?: File | null;
}

/** Uploads the optional photo, then writes both the Auth profile and users/{uid}. */
export async function saveProfile({
  displayName,
  photo,
}: SaveProfileInput): Promise<Profile> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  let photoURL = "";
  let avatarPath: string | undefined;
  if (photo) {
    avatarPath = `${user.uid}/profile/profile_pic/${photo.name}`;
    const photoRef = ref(storage, avatarPath);
    await uploadBytes(photoRef, photo);
    photoURL = await getDownloadURL(photoRef);
  }
  const profilePictureUrl = photoURL || safePictureUrl(user.photoURL);

  await updateAuthProfile(user, { displayName, photoURL: profilePictureUrl });

  const profile: Profile = {
    uid: user.uid,
    nickname: displayName,
    profilePictureUrl,
    email: user.email ?? "",
    ...(photo ? { avatarKind: "photo" as const, avatarPath } : {}),
  };
  await setDoc(doc(db, "users", user.uid), profile, { merge: true });
  return profile;
}

/** Change only the nickname. */
export async function updateNickname(uid: string, nickname: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { nickname });
  if (auth.currentUser)
    await updateAuthProfile(auth.currentUser, { displayName: nickname });
}

/**
 * Make `blob` (a transparent WebP of a die-cut sticker) the profile picture. The new file gets a
 * new name, so caches never serve the old one; the previous file is removed afterwards.
 */
export async function setStickerAvatar(
  uid: string,
  blob: Blob,
  previousPath?: string,
): Promise<{ url: string; path: string }> {
  const path = `${uid}/profile/profile_pic/avatar_${Date.now()}.webp`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: blob.type || "image/webp" });
  const url = await getDownloadURL(fileRef);
  await updateDoc(doc(db, "users", uid), {
    profilePictureUrl: url,
    avatarKind: "sticker",
    avatarPath: path,
  });
  if (auth.currentUser) await updateAuthProfile(auth.currentUser, { photoURL: url });
  if (previousPath && previousPath !== path)
    await deleteFileIfExists(ref(storage, previousPath)).catch(() => {});
  return { url, path };
}

/** Back to the initial letter. */
export async function clearAvatar(uid: string, previousPath?: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    profilePictureUrl: "",
    avatarKind: deleteField(),
    avatarPath: deleteField(),
  });
  if (auth.currentUser) await updateAuthProfile(auth.currentUser, { photoURL: "" });
  if (previousPath) await deleteFileIfExists(ref(storage, previousPath)).catch(() => {});
}
