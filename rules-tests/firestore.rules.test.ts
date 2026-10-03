import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-zoofus-firestore",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const profile = (uid: string) => ({
  uid,
  nickname: "Leo",
  profilePictureUrl: "",
  email: "leo@example.com",
});
const sticker = (uid: string) => ({
  name: "Froggo",
  storagePath: `${uid}/stickers/a.png`,
  imageUrl: "https://example.com/a.png",
  width: 400,
  height: 300,
  createdAt: serverTimestamp(),
});

describe("users/{uid}", () => {
  it("lets the owner create and read their profile", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, "users/alice"), profile("alice")));
    await assertSucceeds(getDoc(doc(db, "users/alice")));
  });

  it("denies other users and anonymous visitors", async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), "users/alice"), profile("alice")),
    );
    await assertFails(
      getDoc(doc(env.authenticatedContext("bob").firestore(), "users/alice")),
    );
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), "users/alice")),
    );
    await assertFails(
      setDoc(
        doc(env.authenticatedContext("bob").firestore(), "users/alice"),
        profile("alice"),
      ),
    );
  });

  it("rejects a profile whose uid does not match, has extra fields, or a long nickname", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "users/alice"), profile("mallory")));
    await assertFails(
      setDoc(doc(db, "users/alice"), { ...profile("alice"), admin: true }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice"), { ...profile("alice"), nickname: "x".repeat(41) }),
    );
  });

  it("never allows deleting a profile", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await setDoc(doc(db, "users/alice"), profile("alice"));
    await assertFails(deleteDoc(doc(db, "users/alice")));
  });
});

describe("users/{uid}/stickers/{id}", () => {
  it("lets the owner create, read, rename and delete a sticker", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/stickers/s1");
    await assertSucceeds(setDoc(ref, sticker("alice")));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { name: "Renamed" }));
    await assertSucceeds(deleteDoc(ref));
  });

  it("denies other users and anonymous visitors", async () => {
    await assertFails(
      setDoc(
        doc(env.authenticatedContext("bob").firestore(), "users/alice/stickers/s1"),
        sticker("alice"),
      ),
    );
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), "users/alice/stickers/s1")),
    );
  });

  it("rejects invalid stickers", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/stickers/s1");
    await assertFails(setDoc(ref, { ...sticker("alice"), name: "" }));
    await assertFails(setDoc(ref, { ...sticker("alice"), name: "x".repeat(61) }));
    await assertFails(setDoc(ref, { ...sticker("alice"), width: 0 }));
    await assertFails(
      setDoc(ref, { ...sticker("alice"), storagePath: "bob/stickers/a.png" }),
    );
    await assertFails(
      setDoc(ref, { ...sticker("alice"), createdAt: new Date(2020, 1, 1) }),
    );
    await assertFails(setDoc(ref, { ...sticker("alice"), extra: 1 }));
  });

  it("allows only renaming after creation", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/stickers/s1");
    await setDoc(ref, sticker("alice"));
    await assertFails(updateDoc(ref, { width: 999 }));
    await assertFails(updateDoc(ref, { imageUrl: "https://evil.example/x.png" }));
  });
});

describe("everything else", () => {
  it("is denied", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "anything/else"), { a: 1 }));
    await assertFails(getDoc(doc(db, "anything/else")));
  });
});
