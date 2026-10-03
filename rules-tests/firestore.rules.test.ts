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

  it("lets only the owner delete their profile", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await setDoc(doc(db, "users/alice"), profile("alice"));
    await assertFails(
      deleteDoc(doc(env.authenticatedContext("bob").firestore(), "users/alice")),
    );
    await assertSucceeds(deleteDoc(doc(db, "users/alice")));
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

  it("accepts optional thumbnail fields and rejects a thumbnail path in someone else's folder", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/alice/stickers/t1"), {
        ...sticker("alice"),
        thumbnailUrl: "https://example.com/t.png",
        thumbnailPath: "alice/stickers/t1_thumb.png",
      }),
    );
    await assertFails(
      setDoc(doc(db, "users/alice/stickers/t2"), {
        ...sticker("alice"),
        thumbnailPath: "bob/stickers/t2_thumb.png",
      }),
    );
  });

  it("allows only renaming after creation", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/stickers/s1");
    await setDoc(ref, sticker("alice"));
    await assertFails(updateDoc(ref, { width: 999 }));
    await assertFails(updateDoc(ref, { imageUrl: "https://evil.example/x.png" }));
  });
});

describe("users/{uid}/pages/{id}", () => {
  const page = () => ({
    title: "Trip",
    width: 1080,
    height: 1440,
    background: "plain",
    items: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  it("lets the owner create, read, update and delete a page", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/pages/p1");
    await assertSucceeds(setDoc(ref, page()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(
      updateDoc(ref, { title: "Renamed", updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(deleteDoc(ref));
  });

  it("denies other users and anonymous visitors", async () => {
    await assertFails(
      setDoc(
        doc(env.authenticatedContext("bob").firestore(), "users/alice/pages/p1"),
        page(),
      ),
    );
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), "users/alice/pages/p1")),
    );
  });

  it("rejects oversize pages, bad dimensions and extra fields", async () => {
    const ref = doc(
      env.authenticatedContext("alice").firestore(),
      "users/alice/pages/p1",
    );
    await assertFails(setDoc(ref, { ...page(), items: new Array(201).fill({}) }));
    await assertFails(setDoc(ref, { ...page(), width: 50 }));
    await assertFails(setDoc(ref, { ...page(), title: "x".repeat(81) }));
    await assertFails(setDoc(ref, { ...page(), extra: 1 }));
    await assertFails(setDoc(ref, { ...page(), updatedAt: new Date(2020, 1, 1) }));
  });

  it("does not let the creation time change", async () => {
    const ref = doc(
      env.authenticatedContext("alice").firestore(),
      "users/alice/pages/p1",
    );
    await setDoc(ref, page());
    await assertFails(
      updateDoc(ref, { createdAt: new Date(2020, 1, 1), updatedAt: serverTimestamp() }),
    );
  });
});

describe("everything else", () => {
  it("is denied", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "anything/else"), { a: 1 }));
    await assertFails(getDoc(doc(db, "anything/else")));
  });
});
