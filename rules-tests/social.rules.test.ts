import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-zoofus-social",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const seed = (fn: (db: ReturnType<typeof as>) => Promise<unknown>) =>
  env.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore() as never);
  });

const page = {
  width: 840,
  height: 1188,
  paper: "notebook",
  pattern: "ruled",
  color: "cream-100",
};

describe("journals", () => {
  const journal = (over: object = {}) => ({
    title: "Trip",
    page,
    items: [{ id: "a", t: "s", ref: "sticker1", x: 10, y: 10, sc: 1, r: 0, z: 0 }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  });

  it("lets the owner create, read, update and delete", async () => {
    const ref = doc(as("alice"), "users/alice/journals/j1");
    await assertSucceeds(setDoc(ref, journal()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(
      updateDoc(ref, { title: "Trip 2", updatedAt: serverTimestamp() }),
    );
    await assertSucceeds(deleteDoc(ref));
  });

  it("lets the owner add a page picture alone, but nothing else without a new updated time", async () => {
    const ref = doc(as("alice"), "users/alice/journals/j1");
    await assertSucceeds(setDoc(ref, journal()));
    await assertSucceeds(
      updateDoc(ref, {
        thumbUrl: "https://example.com/t.webp",
        thumbPath: "alice/journals/j1/thumb_1.webp",
      }),
    );
    // another file's path, other fields, or a missing path: refused
    await assertFails(
      updateDoc(ref, { thumbUrl: "https://example.com/t.webp", thumbPath: "bob/x.webp" }),
    );
    await assertFails(updateDoc(ref, { title: "Sneaky" }));
    await assertFails(
      updateDoc(ref, {
        title: "Sneaky",
        thumbUrl: "https://example.com/t.webp",
        thumbPath: "alice/journals/j1/thumb_2.webp",
      }),
    );
  });

  it("denies everyone else", async () => {
    await assertFails(setDoc(doc(as("bob"), "users/alice/journals/j1"), journal()));
    await seed((db) =>
      setDoc(doc(db, "users/alice/journals/j1"), {
        ...journal(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await assertFails(getDoc(doc(as("bob"), "users/alice/journals/j1")));
  });

  it("bounds the paper, the title and the number of items", async () => {
    const ref = doc(as("alice"), "users/alice/journals/j1");
    await assertFails(setDoc(ref, journal({ title: "" })));
    await assertFails(setDoc(ref, journal({ page: { ...page, width: 100 } })));
    await assertFails(setDoc(ref, journal({ page: { ...page, paper: "cardboard" } })));
    await assertFails(
      setDoc(ref, journal({ page: { ...page, color: "chartreuse-400" } })),
    );
    await assertFails(setDoc(ref, journal({ items: new Array(401).fill({ id: "a" }) })));
    await assertFails(setDoc(ref, journal({ extra: 1 })));
    await assertSucceeds(
      setDoc(ref, journal({ items: new Array(400).fill({ id: "a" }) })),
    );
  });
});

describe("journal items in their own document", () => {
  const slim = (over: object = {}) => ({
    title: "Trip",
    page,
    itemCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  });
  const body = (over: object = {}) => ({
    items: [{ id: "a", t: "s", ref: "sticker1", x: 10, y: 10, sc: 1, r: 0, z: 0 }],
    updatedAt: serverTimestamp(),
    ...over,
  });

  it("lets the owner write a journal with its items in body/items, in one batch", async () => {
    const db = as("alice");
    const batch = writeBatch(db);
    batch.set(doc(db, "users/alice/journals/j1"), slim());
    batch.set(doc(db, "users/alice/journals/j1/body/items"), body());
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(db, "users/alice/journals/j1/body/items")));
    await assertSucceeds(deleteDoc(doc(db, "users/alice/journals/j1/body/items")));
  });

  it("bounds the items document and its name, and keeps it private", async () => {
    const db = as("alice");
    const ref = doc(db, "users/alice/journals/j1/body/items");
    await assertFails(setDoc(ref, body({ items: new Array(401).fill({ id: "a" }) })));
    await assertFails(setDoc(ref, body({ extra: 1 })));
    await assertFails(setDoc(doc(db, "users/alice/journals/j1/body/other"), body()));
    await assertSucceeds(setDoc(ref, body({ items: new Array(400).fill({ id: "a" }) })));
    await assertFails(getDoc(doc(as("bob"), "users/alice/journals/j1/body/items")));
    await assertFails(
      setDoc(doc(as("bob"), "users/alice/journals/j1/body/items"), body()),
    );
  });

  it("refuses a count that is not a number in range", async () => {
    const ref = doc(as("alice"), "users/alice/journals/j1");
    await assertFails(setDoc(ref, slim({ itemCount: 401 })));
    await assertFails(setDoc(ref, slim({ itemCount: -1 })));
    await assertFails(setDoc(ref, slim({ itemCount: "3" })));
    await assertSucceeds(setDoc(ref, slim({ itemCount: 400 })));
  });

  it("lets an older journal move its items out, with nothing else changed", async () => {
    await seed((db) =>
      setDoc(doc(db, "users/alice/journals/j1"), {
        title: "Old",
        page,
        items: [{ id: "a", t: "s", ref: "sticker1", x: 1, y: 1, sc: 1, r: 0, z: 0 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const db = as("alice");
    const ref = doc(db, "users/alice/journals/j1");
    // a title change without a new updated time is not allowed in the same move
    await assertFails(updateDoc(ref, { items: deleteField(), itemCount: 1, title: "x" }));
    const batch = writeBatch(db);
    batch.set(doc(db, "users/alice/journals/j1/body/items"), body());
    batch.update(ref, { items: deleteField(), itemCount: 1 });
    await assertSucceeds(batch.commit());
    // putting items back inline without a new updated time is not part of the move
    await assertFails(updateDoc(ref, { items: [{ id: "a" }], itemCount: 1 }));
  });
});

describe("collections", () => {
  const col = (over: object = {}) => ({
    name: "Summer",
    items: [{ k: "sticker", id: "s1" }],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  });
  it("is the owner's, with a name and at most 500 pointers", async () => {
    const ref = doc(as("alice"), "users/alice/collections/c1");
    await assertSucceeds(setDoc(ref, col()));
    await assertSucceeds(updateDoc(ref, { items: [], updatedAt: serverTimestamp() }));
    await assertFails(
      setDoc(doc(as("alice"), "users/alice/collections/c2"), col({ name: "" })),
    );
    await assertFails(
      setDoc(
        doc(as("alice"), "users/alice/collections/c3"),
        col({ items: new Array(501).fill({ k: "tape", id: "t" }) }),
      ),
    );
    await assertFails(
      setDoc(
        doc(as("alice"), "users/alice/collections/c4"),
        col({ items: [{ k: "sock", id: "x" }] }),
      ),
    );
    await assertFails(setDoc(doc(as("bob"), "users/alice/collections/c5"), col()));
  });
});

describe("public profiles and friend codes", () => {
  const pub = (over: object = {}) => ({
    nickname: "Mei",
    avatarUrl: "",
    friendCode: "ABCD2345",
    updatedAt: serverTimestamp(),
    ...over,
  });
  it("holds a small picture inside the profile, and a key for where it came from", async () => {
    await assertSucceeds(
      setDoc(
        doc(as("alice"), "publicProfiles/alice"),
        pub({
          avatarUrl: "data:image/webp;base64," + "A".repeat(20000),
          avatarKey: "1abc2d",
        }),
      ),
    );
    await assertFails(
      setDoc(
        doc(as("alice"), "publicProfiles/alice"),
        pub({ avatarUrl: "data:image/webp;base64," + "A".repeat(50000) }),
      ),
    );
  });
  it("lets anyone signed in read one profile, but nobody list them", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "publicProfiles/alice"), pub()));
    await assertSucceeds(getDoc(doc(as("bob"), "publicProfiles/alice")));
    await assertFails(getDocs(collection(as("bob"), "publicProfiles")));
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), "publicProfiles/alice")),
    );
  });
  it("only the owner writes it, and the code must look like a code", async () => {
    await assertFails(setDoc(doc(as("bob"), "publicProfiles/alice"), pub()));
    await assertFails(
      setDoc(doc(as("alice"), "publicProfiles/alice"), pub({ friendCode: "abc" })),
    );
    await assertFails(
      setDoc(doc(as("alice"), "publicProfiles/alice"), pub({ nickname: "" })),
    );
    await assertFails(
      setDoc(doc(as("alice"), "publicProfiles/alice"), pub({ email: "a@b.c" })),
    );
  });
  it("friend codes are found one at a time and claimed by their owner", async () => {
    await seed((db) =>
      setDoc(doc(db, "publicProfiles/alice"), {
        nickname: "Alice",
        avatarUrl: "",
        friendCode: "ABCD2345",
        updatedAt: new Date(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(as("alice"), "friendCodes/ABCD2345"), { uid: "alice" }),
    );
    await assertSucceeds(getDoc(doc(as("bob"), "friendCodes/ABCD2345")));
    await assertFails(getDocs(collection(as("bob"), "friendCodes")));
    await assertFails(setDoc(doc(as("bob"), "friendCodes/EFGH6789"), { uid: "alice" }));
    await assertFails(setDoc(doc(as("bob"), "friendCodes/short"), { uid: "bob" }));
    // a code that is not the one in my own public profile cannot be claimed (no squatting)
    await assertFails(setDoc(doc(as("alice"), "friendCodes/JKLM3456"), { uid: "alice" }));
    await assertFails(setDoc(doc(as("bob"), "friendCodes/JKLM3456"), { uid: "bob" }));
    await assertFails(deleteDoc(doc(as("bob"), "friendCodes/ABCD2345")));
    await assertSucceeds(deleteDoc(doc(as("alice"), "friendCodes/ABCD2345")));
  });
});

describe("friend requests and friendships", () => {
  it("a person can ask another, once, and only as themselves", async () => {
    await assertSucceeds(
      setDoc(doc(as("alice"), "users/bob/requests/alice"), {
        from: "alice",
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(as("carol"), "users/bob/requests/alice"), {
        from: "alice",
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      setDoc(doc(as("alice"), "users/alice/requests/alice"), {
        from: "alice",
        createdAt: serverTimestamp(),
      }),
    );
  });
  it("only the two people can read the request", async () => {
    await seed((db) =>
      setDoc(doc(db, "users/bob/requests/alice"), {
        from: "alice",
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(getDoc(doc(as("bob"), "users/bob/requests/alice")));
    await assertSucceeds(getDoc(doc(as("alice"), "users/bob/requests/alice")));
    await assertFails(getDoc(doc(as("carol"), "users/bob/requests/alice")));
  });
  it("my record of a sent request can be removed by me or by the person I asked", async () => {
    await seed((db) =>
      setDoc(doc(db, "users/alice/sentRequests/bob"), {
        to: "bob",
        createdAt: new Date(),
      }),
    );
    await assertFails(deleteDoc(doc(as("carol"), "users/alice/sentRequests/bob")));
    await assertSucceeds(deleteDoc(doc(as("bob"), "users/alice/sentRequests/bob")));
  });
  it("accepting writes both friend documents in one batch", async () => {
    await seed((db) =>
      setDoc(doc(db, "users/bob/requests/alice"), {
        from: "alice",
        createdAt: new Date(),
      }),
    );
    const db = as("bob");
    const batch = writeBatch(db);
    batch.set(doc(db, "users/bob/friends/alice"), { since: serverTimestamp() });
    batch.set(doc(db, "users/alice/friends/bob"), { since: serverTimestamp() });
    batch.delete(doc(db, "users/bob/requests/alice"));
    await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(as("alice"), "users/alice/friends/bob")));
  });
  it("nobody can make themselves someone's friend without a request", async () => {
    await assertFails(
      setDoc(doc(as("alice"), "users/bob/friends/alice"), { since: serverTimestamp() }),
    );
    await assertFails(
      setDoc(doc(as("alice"), "users/alice/friends/bob"), { since: serverTimestamp() }),
    );
    await assertFails(
      setDoc(doc(as("mallory"), "users/alice/friends/mallory"), {
        since: serverTimestamp(),
      }),
    );
  });
  it("a friend can be given a nickname, by the owner only", async () => {
    await seed((db) => setDoc(doc(db, "users/alice/friends/bob"), { since: new Date() }));
    await assertSucceeds(
      updateDoc(doc(as("alice"), "users/alice/friends/bob"), { nickname: "Bobby" }),
    );
    await assertFails(
      updateDoc(doc(as("alice"), "users/alice/friends/bob"), {
        nickname: "x".repeat(41),
      }),
    );
    await assertFails(
      updateDoc(doc(as("bob"), "users/alice/friends/bob"), { nickname: "me" }),
    );
    await assertFails(
      updateDoc(doc(as("alice"), "users/alice/friends/bob"), { since: new Date() }),
    );
  });
  it("unfriending removes both sides", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users/alice/friends/bob"), { since: new Date() });
      await setDoc(doc(db, "users/bob/friends/alice"), { since: new Date() });
    });
    const db = as("alice");
    const batch = writeBatch(db);
    batch.delete(doc(db, "users/alice/friends/bob"));
    batch.delete(doc(db, "users/bob/friends/alice"));
    await assertSucceeds(batch.commit());
    await assertFails(deleteDoc(doc(as("carol"), "users/alice/friends/bob")));
  });
});

describe("sharing", () => {
  const share = (over: object = {}) => ({
    from: "alice",
    kind: "sticker",
    name: "Frog",
    payload: {
      imageUrl:
        "https://firebasestorage.googleapis.com/v0/b/b.firebasestorage.app/o/a%2Fb.webp?alt=media&token=t",
      width: 10,
      height: 10,
    },
    files: ["alice/shares/s1/a.webp"],
    seen: false,
    createdAt: serverTimestamp(),
    ...over,
  });
  beforeEach(() =>
    seed((db) => setDoc(doc(db, "users/bob/friends/alice"), { since: new Date() })),
  );

  it("the person I shared with can tell me they are done, and only them", async () => {
    await seed((db) =>
      setDoc(doc(db, "users/alice/sent/s1"), {
        to: "bob",
        kind: "sticker",
        name: "x",
        files: [],
        createdAt: new Date(),
      }),
    );
    const done = (by: string) => ({ by, at: serverTimestamp() });
    await assertSucceeds(setDoc(doc(as("bob"), "users/alice/shareDone/s1"), done("bob")));
    await assertFails(
      setDoc(doc(as("carol"), "users/alice/shareDone/s1"), done("carol")),
    );
    await assertFails(setDoc(doc(as("bob"), "users/alice/shareDone/s1"), done("carol")));
    await assertFails(setDoc(doc(as("bob"), "users/alice/shareDone/nope"), done("bob")));
    await assertFails(getDoc(doc(as("bob"), "users/alice/shareDone/s1")));
    await assertSucceeds(getDoc(doc(as("alice"), "users/alice/shareDone/s1")));
    await assertSucceeds(deleteDoc(doc(as("alice"), "users/alice/shareDone/s1")));
  });
  it("a shared journal's items travel in body/items next to the share, and only the sender can send or take them back", async () => {
    const items = [{ id: "a", t: "x", text: "hi" }];
    const alice = as("alice");
    const send = writeBatch(alice);
    send.set(doc(alice, "users/bob/inbox/j1"), share({ kind: "journal" }));
    send.set(doc(alice, "users/bob/inbox/j1/body/items"), { items });
    await assertSucceeds(send.commit());
    // only I can read them; the sender cannot
    await assertSucceeds(getDoc(doc(as("bob"), "users/bob/inbox/j1/body/items")));
    await assertFails(getDoc(doc(alice, "users/bob/inbox/j1/body/items")));
    // not into a share that is not mine, not without a share, not too many, not another name
    await assertFails(
      setDoc(doc(as("carol"), "users/bob/inbox/j1/body/items"), { items }),
    );
    await assertFails(setDoc(doc(alice, "users/bob/inbox/none/body/items"), { items }));
    await assertFails(
      setDoc(doc(alice, "users/bob/inbox/j1/body/items"), {
        items: new Array(401).fill({ id: "a" }),
      }),
    );
    await assertFails(setDoc(doc(alice, "users/bob/inbox/j1/body/other"), { items }));
    // the sender takes it back; the receiver can put it away
    const back = writeBatch(alice);
    back.delete(doc(alice, "users/bob/inbox/j1/body/items"));
    back.delete(doc(alice, "users/bob/inbox/j1"));
    await assertSucceeds(back.commit());
  });
  it("the receiver can delete a share together with its items", async () => {
    const alice = as("alice");
    const send = writeBatch(alice);
    send.set(doc(alice, "users/bob/inbox/j2"), share({ kind: "journal" }));
    send.set(doc(alice, "users/bob/inbox/j2/body/items"), { items: [] });
    await assertSucceeds(send.commit());
    const bob = as("bob");
    const away = writeBatch(bob);
    away.delete(doc(bob, "users/bob/inbox/j2/body/items"));
    away.delete(doc(bob, "users/bob/inbox/j2"));
    await assertSucceeds(away.commit());
  });
  it("a friend can put something in my inbox, and I can read and delete it", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "users/bob/inbox/s1"), share()));
    await assertSucceeds(getDoc(doc(as("bob"), "users/bob/inbox/s1")));
    await assertSucceeds(updateDoc(doc(as("bob"), "users/bob/inbox/s1"), { seen: true }));
    // keeping it is remembered, but nothing else about it can be edited
    await assertSucceeds(
      updateDoc(doc(as("bob"), "users/bob/inbox/s1"), { seen: true, saved: true }),
    );
    await assertFails(
      updateDoc(doc(as("bob"), "users/bob/inbox/s1"), { name: "Mine now" }),
    );
    await assertFails(getDoc(doc(as("alice"), "users/bob/inbox/s1")));
    await assertSucceeds(deleteDoc(doc(as("bob"), "users/bob/inbox/s1")));
  });
  it("someone who is not my friend cannot", async () => {
    await assertFails(
      setDoc(doc(as("mallory"), "users/bob/inbox/s1"), share({ from: "mallory" })),
    );
  });
  it("it must really come from the sender, and be small and well-formed", async () => {
    await assertFails(
      setDoc(doc(as("alice"), "users/bob/inbox/s1"), share({ from: "carol" })),
    );
    await assertFails(
      setDoc(doc(as("alice"), "users/bob/inbox/s1"), share({ kind: "virus" })),
    );
    await assertFails(
      setDoc(doc(as("alice"), "users/bob/inbox/s1"), share({ seen: true })),
    );
    await assertFails(
      setDoc(
        doc(as("alice"), "users/bob/inbox/s1"),
        share({ files: new Array(101).fill("a") }),
      ),
    );
    await assertFails(
      setDoc(doc(as("alice"), "users/bob/inbox/s1"), share({ note: "x".repeat(201) })),
    );
  });
  it("the sender can take a share back", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "users/bob/inbox/s1"), share()));
    await assertSucceeds(deleteDoc(doc(as("alice"), "users/bob/inbox/s1")));
  });
});

describe("picture links in what others will load", () => {
  const BAD = [
    "https://evil.example/x.png",
    "http://firebasestorage.googleapis.com/v0/b/b/o/x",
    "https://firebasestorage.googleapis.com.evil.example/v0/b/b/o/x",
    "http://169.254.169.254/latest/meta-data",
    "javascript:alert(1)",
    "data:text/html,<script>1</script>",
  ];
  const GOOD = [
    "",
    "data:image/webp;base64,AAAA",
    "https://firebasestorage.googleapis.com/v0/b/b.firebasestorage.app/o/a%2Fb.webp?alt=media&token=t",
    "http://localhost:9199/v0/b/demo.appspot.com/o/a.webp?alt=media",
  ];
  const share = (payload: object) => ({
    from: "alice",
    kind: "sticker",
    name: "Frog",
    payload,
    files: [],
    seen: false,
    createdAt: serverTimestamp(),
  });
  beforeEach(() =>
    seed((db) => setDoc(doc(db, "users/bob/friends/alice"), { since: new Date() })),
  );

  it("a share's imageUrl, sourceUrl and thumbUrl must be storage or data images", async () => {
    for (const field of ["imageUrl", "sourceUrl", "thumbUrl"])
      for (const bad of BAD)
        await assertFails(
          setDoc(doc(as("alice"), `users/bob/inbox/${field}-x`), share({ [field]: bad })),
        );
    for (const good of GOOD)
      await assertSucceeds(
        setDoc(
          doc(as("alice"), "users/bob/inbox/ok-" + GOOD.indexOf(good)),
          share({ imageUrl: good }),
        ),
      );
  });

  it("a public profile's picture must be storage or a data image", async () => {
    const pub = (avatarUrl: string) => ({
      nickname: "Mei",
      avatarUrl,
      friendCode: "ABCD2345",
      updatedAt: serverTimestamp(),
    });
    for (const bad of BAD)
      await assertFails(setDoc(doc(as("alice"), "publicProfiles/alice"), pub(bad)));
    for (const good of GOOD)
      await assertSucceeds(setDoc(doc(as("alice"), "publicProfiles/alice"), pub(good)));
  });
});

describe("workspaces (working together)", () => {
  const ws = (over: object = {}) => ({
    title: "Our page",
    ownerUid: "alice",
    members: ["alice"],
    invited: [],
    page,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  });
  const item = (uid: string, over: object = {}) => ({
    t: "s",
    by: uid,
    upd: serverTimestamp(),
    ref: "a:asset1",
    x: 1,
    y: 2,
    sc: 1,
    r: 0,
    z: 0,
    ...over,
  });
  const seedWs = () =>
    seed(async (db) => {
      // alice is friends with bob and carol, not with mallory
      for (const f of ["bob", "carol"])
        await setDoc(doc(db, `users/alice/friends/${f}`), { since: new Date() });
      await setDoc(doc(db, "workspaces/w1"), {
        title: "Our page",
        ownerUid: "alice",
        members: ["alice"],
        invited: ["bob"],
        page,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

  it("anyone can start one, as its only member and owner", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "workspaces/w1"), ws()));
    await assertFails(setDoc(doc(as("alice"), "workspaces/w2"), ws({ ownerUid: "bob" })));
    await assertFails(
      setDoc(doc(as("alice"), "workspaces/w3"), ws({ members: ["alice", "bob"] })),
    );
    await assertFails(setDoc(doc(as("alice"), "workspaces/w4"), ws({ title: "" })));
    // nobody is invited at the start: invitations are added afterwards, to friends
    await assertFails(
      setDoc(doc(as("alice"), "workspaces/w5"), ws({ invited: ["mallory"] })),
    );
  });
  it("members and invited people can read; strangers cannot", async () => {
    await seedWs();
    await assertSucceeds(getDoc(doc(as("alice"), "workspaces/w1")));
    await assertSucceeds(getDoc(doc(as("bob"), "workspaces/w1")));
    await assertFails(getDoc(doc(as("carol"), "workspaces/w1")));
  });
  it("I can list the workspaces I am in, and the ones I am invited to", async () => {
    await seedWs();
    await assertSucceeds(
      getDocs(
        query(
          collection(as("alice"), "workspaces"),
          where("members", "array-contains", "alice"),
        ),
      ),
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(as("bob"), "workspaces"),
          where("invited", "array-contains", "bob"),
        ),
      ),
    );
    await assertFails(getDocs(collection(as("carol"), "workspaces")));
  });
  it("a member keeps a small picture of the page, and only a small one", async () => {
    await seedWs();
    await assertSucceeds(
      setDoc(
        doc(as("alice"), "workspaces/w9"),
        ws({ thumb: "data:image/webp;base64,AAAA" }),
      ),
    );
    await assertFails(
      setDoc(doc(as("alice"), "workspaces/w8"), ws({ thumb: "x".repeat(60001) })),
    );
    await assertFails(setDoc(doc(as("alice"), "workspaces/w7"), ws({ thumb: 5 })));
  });
  it("an invited friend can join, and only by adding themselves", async () => {
    await seedWs();
    await assertSucceeds(
      updateDoc(doc(as("bob"), "workspaces/w1"), {
        members: ["alice", "bob"],
        invited: [],
        updatedAt: serverTimestamp(),
      }),
    );
    await seedWs();
    await assertFails(
      updateDoc(doc(as("carol"), "workspaces/w1"), {
        members: ["alice", "carol"],
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(as("bob"), "workspaces/w1"), {
        members: ["alice", "bob", "mallory"],
        invited: [],
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(as("bob"), "workspaces/w1"), {
        members: ["alice", "bob"],
        invited: [],
        title: "Mine now",
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it("an invited friend can say no, and only by removing themselves", async () => {
    await seedWs();
    await assertSucceeds(
      updateDoc(doc(as("bob"), "workspaces/w1"), {
        invited: [],
        updatedAt: serverTimestamp(),
      }),
    );
    await seedWs();
    await assertFails(
      updateDoc(doc(as("bob"), "workspaces/w1"), {
        invited: [],
        title: "x",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(as("carol"), "workspaces/w1"), {
        invited: [],
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it("a member can invite friends (one at a time) and rename it, but not change who is in or own it", async () => {
    await seedWs();
    await assertSucceeds(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        invited: ["bob", "carol"],
        title: "Renamed",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        members: ["alice", "mallory"],
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        ownerUid: "bob",
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it("a non-friend cannot be invited, alone or with friends in the same write", async () => {
    await seedWs();
    await assertFails(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        invited: ["bob", "mallory"],
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        invited: ["bob", "carol", "mallory"],
        updatedAt: serverTimestamp(),
      }),
    );
    // two new people at once cannot be checked, so it is refused
    await assertFails(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        invited: ["bob", "carol", "dave"],
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it("the first friend can be invited right after the page is made", async () => {
    await seedWs();
    await assertSucceeds(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        invited: [],
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        invited: ["carol"],
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it("someone invited can be taken off again", async () => {
    await seedWs();
    await assertSucceeds(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        invited: [],
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it("only the owner deletes it; a non-owner member may leave", async () => {
    await seed((db) =>
      setDoc(doc(db, "workspaces/w1"), {
        title: "T",
        ownerUid: "alice",
        members: ["alice", "bob"],
        invited: [],
        page,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(as("bob"), "workspaces/w1"), {
        members: ["alice"],
        updatedAt: serverTimestamp(),
      }),
    );
    await assertFails(deleteDoc(doc(as("bob"), "workspaces/w1")));
    await assertSucceeds(deleteDoc(doc(as("alice"), "workspaces/w1")));
  });
  it("members place, move and remove objects; others cannot", async () => {
    await seed((db) =>
      setDoc(doc(db, "workspaces/w1"), {
        title: "T",
        ownerUid: "alice",
        members: ["alice", "bob"],
        invited: [],
        page,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await assertSucceeds(setDoc(doc(as("bob"), "workspaces/w1/items/i1"), item("bob")));
    // a sticker may be stretched (sy), within bounds
    await assertSucceeds(
      setDoc(
        doc(as("bob"), "workspaces/w1/items/st"),
        item("bob", { t: "s", ref: "a:x", sc: 1, sy: 1.6 }),
      ),
    );
    await assertFails(
      setDoc(
        doc(as("bob"), "workspaces/w1/items/st2"),
        item("bob", { t: "s", ref: "a:x", sc: 1, sy: 99 }),
      ),
    );
    await assertSucceeds(
      setDoc(doc(as("alice"), "workspaces/w1/items/i1"), item("alice", { x: 50 })),
    );
    await assertSucceeds(getDoc(doc(as("bob"), "workspaces/w1/items/i1")));
    await assertFails(setDoc(doc(as("carol"), "workspaces/w1/items/i2"), item("carol")));
    await assertFails(getDoc(doc(as("carol"), "workspaces/w1/items/i1")));
    await assertSucceeds(deleteDoc(doc(as("bob"), "workspaces/w1/items/i1")));
  });
  it("an object is bounded, signed by the person who wrote it, and carries no markup", async () => {
    await seed((db) =>
      setDoc(doc(db, "workspaces/w1"), {
        title: "T",
        ownerUid: "alice",
        members: ["alice"],
        invited: [],
        page,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const at = (id: string) => doc(as("alice"), `workspaces/w1/items/${id}`);
    await assertFails(setDoc(at("a"), item("bob")));
    await assertFails(setDoc(at("b"), item("alice", { t: "script" })));
    await assertFails(setDoc(at("c"), item("alice", { sc: 100 })));
    await assertFails(setDoc(at("d"), item("alice", { x: 1e9 })));
    await assertFails(setDoc(at("e"), item("alice", { text: "x".repeat(501) })));
    await assertFails(setDoc(at("f"), item("alice", { tool: "chainsaw" })));
    await assertFails(setDoc(at("g"), item("alice", { onclick: "x" })));
    await assertSucceeds(
      setDoc(
        at("h"),
        item("alice", {
          t: "x",
          text: "hello",
          font: "caveat",
          size: 40,
          color: "plum-900",
        }),
      ),
    );
  });
  it("assets are copies in the member's own folder", async () => {
    await seed((db) =>
      setDoc(doc(db, "workspaces/w1"), {
        title: "T",
        ownerUid: "alice",
        members: ["alice", "bob"],
        invited: [],
        page,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const asset = (uid: string, over: object = {}) => ({
      kind: "sticker",
      owner: uid,
      url: "https://firebasestorage.googleapis.com/v0/b/b.firebasestorage.app/o/a%2Fb.webp?alt=media&token=t",
      path: `${uid}/collab/w1/a.webp`,
      w: 10,
      h: 10,
      name: "Frog",
      ...over,
    });
    await assertSucceeds(setDoc(doc(as("bob"), "workspaces/w1/assets/a1"), asset("bob")));
    // a link to anywhere else would be requested by everyone who opens the shelf
    for (const url of [
      "https://evil.example/x.png",
      "http://169.254.169.254/x",
      "file:///etc/passwd",
    ])
      await assertFails(
        setDoc(doc(as("bob"), "workspaces/w1/assets/bad"), asset("bob", { url })),
      );
    // the page's thumbnail is a picture too
    await assertFails(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        thumb: "https://evil.example/x.png",
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(doc(as("alice"), "workspaces/w1"), {
        thumb: "data:image/webp;base64,AAAA",
        updatedAt: serverTimestamp(),
      }),
    );
    // the picture itself can be kept in the entry (a data URL), with no file behind it
    const inline: Record<string, unknown> = asset("bob", {
      url: "data:image/webp;base64," + "A".repeat(60000),
    });
    delete inline.path;
    await assertSucceeds(setDoc(doc(as("bob"), "workspaces/w1/assets/inline"), inline));
    await assertFails(
      setDoc(
        doc(as("bob"), "workspaces/w1/assets/huge"),
        asset("bob", { url: "data:image/webp;base64," + "A".repeat(170000) }),
      ),
    );
    await assertFails(setDoc(doc(as("bob"), "workspaces/w1/assets/a2"), asset("alice")));
    await assertFails(
      setDoc(
        doc(as("bob"), "workspaces/w1/assets/a3"),
        asset("bob", { path: "alice/collab/w1/a.webp" }),
      ),
    );
    await assertFails(
      setDoc(doc(as("carol"), "workspaces/w1/assets/a4"), asset("carol")),
    );
    await assertSucceeds(deleteDoc(doc(as("alice"), "workspaces/w1/assets/a1"))); // the owner may clear any
    // a tape on the shelf is only its print
    const tape = { owner: "bob", kind: "tape", name: "Dots", tape: { thickness: 20 } };
    await assertSucceeds(setDoc(doc(as("bob"), "workspaces/w1/assets/t1"), tape));
    await assertFails(
      setDoc(doc(as("bob"), "workspaces/w1/assets/t2"), { ...tape, url: "https://x" }),
    );
    await assertFails(
      setDoc(doc(as("bob"), "workspaces/w1/assets/t3"), { ...tape, kind: "gadget" }),
    );
  });
  it("presence is each person's own heartbeat", async () => {
    await seed((db) =>
      setDoc(doc(db, "workspaces/w1"), {
        title: "T",
        ownerUid: "alice",
        members: ["alice", "bob"],
        invited: [],
        page,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    const beat = { name: "Mei", color: "pink-200", ts: serverTimestamp() };
    await assertSucceeds(setDoc(doc(as("alice"), "workspaces/w1/presence/alice"), beat));
    await assertFails(setDoc(doc(as("alice"), "workspaces/w1/presence/bob"), beat));
    await assertSucceeds(getDoc(doc(as("bob"), "workspaces/w1/presence/alice")));
  });
});

describe("adminCheck (who may open /diagnostics)", () => {
  const read = (ctx: ReturnType<typeof env.authenticatedContext>) =>
    getDoc(doc(ctx.firestore(), "adminCheck/ping"));
  const manager = { email: "XinranCao.XC@gmail.com", email_verified: true };

  it("lets a project manager with a verified e-mail in", async () => {
    await assertSucceeds(read(env.authenticatedContext("m", manager)));
  });
  it("keeps everyone else out", async () => {
    await assertFails(
      read(env.authenticatedContext("m", { ...manager, email_verified: false })),
    );
    await assertFails(
      read(
        env.authenticatedContext("x", {
          email: "someone@example.com",
          email_verified: true,
        }),
      ),
    );
    await assertFails(read(env.authenticatedContext("n")));
    await assertFails(read(env.unauthenticatedContext()));
  });
  it("cannot be written or listed by anyone", async () => {
    const db = env.authenticatedContext("m", manager).firestore();
    await assertFails(setDoc(doc(db, "adminCheck/ping"), { a: 1 }));
    await assertFails(getDocs(collection(db, "adminCheck")));
  });
});
