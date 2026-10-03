import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { AuthContext, type AuthContextValue } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
      }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      signup: (email, password) => createUserWithEmailAndPassword(auth, email, password),
      login: (email, password) => signInWithEmailAndPassword(auth, email, password),
      loginWithGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
      logout: () => signOut(auth),
      resetPassword: (email) => sendPasswordResetEmail(auth, email),
    }),
    [currentUser],
  );

  return (
    <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
  );
}
