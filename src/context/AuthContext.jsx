import React, { useContext, useState, useEffect } from "react";
import { storage, db, auth } from "../services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
} from "firebase/auth";

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function updateProfile({ displayName, photo }) {
    const user = auth.currentUser;
    let photoURL = "";

    if (photo) {
      const photoRef = ref(
        storage,
        `${user.uid}/profile/profile_pic/${photo.name}`
      );
      await uploadBytes(photoRef, photo);
      photoURL = await getDownloadURL(photoRef);
    }

    // Update Firebase Auth profile
    await firebaseUpdateProfile(user, {
      displayName,
      photoURL: photoURL || user.photoURL || "",
    });

    // Save extra info to Firestore
    await setDoc(doc(db, "users", user.uid), {
      nickname: displayName,
      profilePictureUrl: photoURL || user.photoURL || "",
      email: user.email,
      uid: user.uid,
    });
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
