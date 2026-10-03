import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { db, storage, auth } from "../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile as firebaseUpdateProfile } from "firebase/auth";

export const fetchUserProfile = createAsyncThunk(
  "user/fetchUserProfile",
  async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  }
);

export const updateUserProfile = createAsyncThunk(
  "user/updateUserProfile",
  async ({ uid, displayName, photo }, { rejectWithValue }) => {
    try {
      let photoURL = "";
      if (photo) {
        const photoRef = ref(
          storage,
          `${uid}/profile/profile_pic/${photo.name}`
        );
        await uploadBytes(photoRef, photo);
        photoURL = await getDownloadURL(photoRef);
      }

      // Update Firebase Auth profile
      const user = auth.currentUser;
      await firebaseUpdateProfile(user, {
        displayName,
        photoURL: photoURL || user.photoURL || "",
      });

      const profileData = {
        nickname: displayName,
        profilePictureUrl: photoURL || user.photoURL || "",
        email: user.email,
        uid,
      };
      await setDoc(doc(db, "users", uid), profileData, { merge: true });
      return profileData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    profile: null,
    status: "idle",
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      });
  },
});

export default userSlice.reducer;
