import type { User, UserCredential } from "firebase/auth";
import { createContext } from "react";

export interface AuthContextValue {
  currentUser: User | null;
  signup: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  /** Re-send the verification email to the signed-in user. */
  sendVerification: () => Promise<void>;
  /** Reload the signed-in user from Firebase (e.g. after they verified their email). */
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
