import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { auth } from "@/lib/firebase";
import { AuthContext, type AuthContextValue } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  // `User` objects are mutated in place by reload(); this counter makes the context update.
  const [version, setVersion] = useState(0);

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
      signup: async (email, password) => {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // Best effort: a failed email must not block sign-up.
        sendEmailVerification(credential.user).catch(() => {});
        return credential;
      },
      login: (email, password) => signInWithEmailAndPassword(auth, email, password),
      loginWithGoogle: () => signInWithPopup(auth, new GoogleAuthProvider()),
      logout: async () => {
        await signOut(auth);
        queryClient.clear(); // drop the previous user's cached data
      },
      resetPassword: (email) => sendPasswordResetEmail(auth, email),
      sendVerification: async () => {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      },
      refreshUser: async () => {
        await auth.currentUser?.reload();
        setVersion((v) => v + 1);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` forces a refresh after reload()
    [currentUser, version, queryClient],
  );

  return (
    <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
  );
}
