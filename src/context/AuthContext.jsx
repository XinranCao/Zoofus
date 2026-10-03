import React, { useContext, useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { useDispatch, useSelector } from "react-redux";
import { updateUserProfile, fetchUserProfile } from "../store/userSlice";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const userProfile = useSelector((state) => state.user.profile);
  const profileStatus = useSelector((state) => state.user.status);
  const profileError = useSelector((state) => state.user.error);

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
    if (!user) return;
    dispatch(
      updateUserProfile({
        uid: user.uid,
        displayName,
        photo,
      })
    );
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (user) {
        dispatch(fetchUserProfile(user.uid));
      }
    });
    return unsubscribe;
  }, [dispatch]);

  const value = {
    currentUser,
    userProfile,
    profileStatus,
    profileError,
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
