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

  it("accepts a source file, an edge and a seed, and validates the edge", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const edge = {
      shape: "torn",
      scale: 1.2,
      fill: { kind: "dots", bg: "pink-200", ink: "sheet-50", scale: 9, weight: 0.35 },
    };
    await assertSucceeds(
      setDoc(doc(db, "users/alice/stickers/e1"), {
        ...sticker("alice"),
        sourcePath: "alice/stickers/e1_src.webp",
        sourceUrl: "https://example.com/src.webp",
        edge,
        seed: "abc",
      }),
    );
    const bad = (e: unknown) =>
      setDoc(doc(db, "users/alice/stickers/e2"), { ...sticker("alice"), edge: e });
    await assertFails(bad({ ...edge, shape: "zigzag" }));
    await assertFails(bad({ ...edge, scale: 2 }));
    await assertFails(bad({ ...edge, fill: { ...edge.fill, kind: "plaid" } }));
    await assertFails(
      bad({ ...edge, fill: { kind: "pixels", bg: "cream-100", pixels: ["00000000"] } }),
    );
    await assertFails(bad({ ...edge, extra: true }));
    await assertFails(
      setDoc(doc(db, "users/alice/stickers/e3"), {
        ...sticker("alice"),
        sourcePath: "bob/stickers/x.webp",
      }),
    );
  });

  it("lets the owner redo the edge (new file, edge, size) but nothing else", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/stickers/e4");
    await setDoc(ref, sticker("alice"));
    await assertSucceeds(
      updateDoc(ref, {
        storagePath: "alice/stickers/e4_v2.webp",
        imageUrl: "https://example.com/v2.webp",
        edge: { shape: "smooth", scale: 1, fill: { kind: "solid", bg: "sheet-50" } },
        width: 420,
        height: 320,
      }),
    );
    await assertFails(updateDoc(ref, { storagePath: "bob/stickers/steal.webp" }));
    await assertFails(updateDoc(ref, { createdAt: new Date(2020, 1, 1) }));
  });

  it("keeps the source, thumbnail and unknown fields fixed after creation", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/stickers/s1");
    await setDoc(ref, sticker("alice"));
    await assertFails(updateDoc(ref, { sourcePath: "alice/stickers/other.webp" }));
    await assertFails(
      updateDoc(ref, { thumbnailPath: "alice/stickers/other_thumb.webp" }),
    );
    await assertFails(updateDoc(ref, { extra: 1 }));
    await assertFails(updateDoc(ref, { name: "" }));
    await assertFails(updateDoc(ref, { width: 0 }));
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

describe("users/{uid}/tapes/{id}", () => {
  const tape = () => ({
    name: "Pink dots",
    pattern: { kind: "dots", bg: "pink-200", ink: "sheet-50", scale: 9, weight: 0.35 },
    thickness: 20,
    opacity: 0.82,
    ends: "torn",
    createdAt: serverTimestamp(),
  });

  it("lets the owner create, read, rename and delete a tape", async () => {
    const db = env.authenticatedContext("alice").firestore();
    const ref = doc(db, "users/alice/tapes/t1");
    await assertSucceeds(setDoc(ref, tape()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { name: "Renamed" }));
    await assertSucceeds(deleteDoc(ref));
  });

  it("denies other users and anonymous visitors", async () => {
    await assertFails(
      setDoc(
        doc(env.authenticatedContext("bob").firestore(), "users/alice/tapes/t1"),
        tape(),
      ),
    );
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), "users/alice/tapes/t1")),
    );
  });

  it("rejects invalid tapes", async () => {
    const ref = doc(
      env.authenticatedContext("alice").firestore(),
      "users/alice/tapes/t1",
    );
    await assertFails(setDoc(ref, { ...tape(), name: "" }));
    await assertFails(setDoc(ref, { ...tape(), name: "x".repeat(41) }));
    await assertFails(setDoc(ref, { ...tape(), thickness: 5 }));
    await assertFails(setDoc(ref, { ...tape(), thickness: 50 }));
    await assertFails(setDoc(ref, { ...tape(), opacity: 0.2 }));
    await assertFails(setDoc(ref, { ...tape(), ends: "zigzag" }));
    await assertFails(
      setDoc(ref, { ...tape(), pattern: { kind: "plaid", bg: "cream-100" } }),
    );
    await assertFails(
      setDoc(ref, {
        ...tape(),
        pattern: { kind: "pixels", bg: "cream-100", pixels: ["00000000"] },
      }),
    );
    await assertFails(
      setDoc(ref, {
        ...tape(),
        pattern: { kind: "doodle", bg: "cream-100", strokes: new Array(61).fill("M1 1") },
      }),
    );
    await assertFails(setDoc(ref, { ...tape(), extra: 1 }));
  });

  describe("limits on a user-designed print", () => {
    const withPattern = (pattern: object) => ({ ...tape(), pattern });
    const ok = { kind: "dots", bg: "pink-200", ink: "sheet-50", scale: 9, weight: 0.35 };
    const refFor = (id = "t1") =>
      doc(env.authenticatedContext("alice").firestore(), `users/alice/tapes/${id}`);

    it("accepts every limit at its edge", async () => {
      await assertSucceeds(
        setDoc(refFor("e1"), withPattern({ ...ok, scale: 6, angle: 0, weight: 0.1 })),
      );
      await assertSucceeds(
        setDoc(refFor("e2"), withPattern({ ...ok, scale: 28, angle: 180, weight: 0.9 })),
      );
      await assertSucceeds(setDoc(refFor("e3"), { ...tape(), name: "x".repeat(40) }));
      await assertSucceeds(
        setDoc(
          refFor("e4"),
          withPattern({
            kind: "pixels",
            bg: "cream-100",
            pixels: [
              "10101010",
              "01010101",
              "11111111",
              "00000000",
              "10101010",
              "01010101",
              "11111111",
              "00000000",
            ],
          }),
        ),
      );
      await assertSucceeds(
        setDoc(
          refFor("e5"),
          withPattern({
            kind: "doodle",
            bg: "cream-100",
            strokes: new Array(60).fill("M1 1 L2 2"),
          }),
        ),
      );
    });

    it("rejects colours outside the 16 user colours", async () => {
      await assertFails(setDoc(refFor(), withPattern({ ...ok, bg: "chartreuse-400" })));
      await assertFails(setDoc(refFor(), withPattern({ ...ok, ink: "#000000" })));
      await assertFails(setDoc(refFor(), withPattern({ ...ok, bg: "red" })));
    });

    it("rejects out-of-range scale, angle and weight", async () => {
      await assertFails(setDoc(refFor(), withPattern({ ...ok, scale: 5 })));
      await assertFails(setDoc(refFor(), withPattern({ ...ok, scale: 29 })));
      await assertFails(setDoc(refFor(), withPattern({ ...ok, angle: -1 })));
      await assertFails(setDoc(refFor(), withPattern({ ...ok, angle: 181 })));
      await assertFails(setDoc(refFor(), withPattern({ ...ok, weight: 0.05 })));
      await assertFails(setDoc(refFor(), withPattern({ ...ok, weight: 0.95 })));
    });

    it("rejects pixels that are not exactly 8 rows of 8 zeros and ones", async () => {
      const rows = (r: string[]) =>
        withPattern({ kind: "pixels", bg: "cream-100", pixels: r });
      const good = new Array(8).fill("00000000");
      await assertFails(setDoc(refFor(), rows(good.slice(0, 7))));
      await assertFails(setDoc(refFor(), rows([...good, "00000000"])));
      await assertFails(setDoc(refFor(), rows([...good.slice(0, 7), "0000000"])));
      await assertFails(setDoc(refFor(), rows([...good.slice(0, 7), "0000000x"])));
      await assertFails(setDoc(refFor(), rows(["2" + "0000000", ...good.slice(1)])));
    });

    it("rejects strokes with markup, or too many", async () => {
      const strokes = (s: unknown[]) =>
        withPattern({ kind: "doodle", bg: "cream-100", strokes: s });
      await assertFails(setDoc(refFor(), strokes(['M1 1"/><script>'])));
      await assertFails(setDoc(refFor(), strokes(["url(javascript:alert(1))"])));
      await assertFails(setDoc(refFor(), strokes(["M1 1 ".repeat(500)])));
      await assertFails(setDoc(refFor(), strokes(new Array(61).fill("M1 1"))));
      await assertFails(setDoc(refFor(), strokes([42])));
    });

    it("applies the same print limits to a sticker edge", async () => {
      const edge = (fill: object) => ({ shape: "torn", scale: 1, fill });
      const db = env.authenticatedContext("alice").firestore();
      const bad = (fill: object) =>
        setDoc(doc(db, "users/alice/stickers/lim"), {
          ...sticker("alice"),
          edge: edge(fill),
        });
      await assertFails(bad({ ...ok, bg: "chartreuse-400" }));
      await assertFails(bad({ ...ok, scale: 30 }));
      await assertFails(bad({ kind: "doodle", bg: "cream-100", strokes: ["<svg/>"] }));
    });
  });

  it("allows only renaming after creation", async () => {
    const ref = doc(
      env.authenticatedContext("alice").firestore(),
      "users/alice/tapes/t1",
    );
    await setDoc(ref, tape());
    await assertFails(updateDoc(ref, { thickness: 30 }));
    await assertFails(updateDoc(ref, { ends: "cut" }));
  });
});

describe("everything else", () => {
  it("is denied", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "anything/else"), { a: 1 }));
    await assertFails(getDoc(doc(db, "anything/else")));
  });
});
