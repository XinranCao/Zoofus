import { updateProfile as updateAuthProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
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
  if (photo) {
    const photoRef = ref(storage, `${user.uid}/profile/profile_pic/${photo.name}`);
    await uploadBytes(photoRef, photo);
    photoURL = await getDownloadURL(photoRef);
  }
  const profilePictureUrl = photoURL || user.photoURL || "";

  await updateAuthProfile(user, { displayName, photoURL: profilePictureUrl });

  const profile: Profile = {
    uid: user.uid,
    nickname: displayName,
    profilePictureUrl,
    email: user.email ?? "",
  };
  await setDoc(doc(db, "users", user.uid), profile, { merge: true });
  return profile;
}
