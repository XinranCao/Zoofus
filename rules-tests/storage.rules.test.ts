import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, listAll, ref, uploadBytes } from "firebase/storage";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-zoofus-storage",
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
});
afterAll(() => env.cleanup());

const bytes = (n: number) => new Uint8Array(n);
const png = { contentType: "image/png" };

describe("stickers", () => {
  it("lets the owner upload a PNG and read it back", async () => {
    const storage = env.authenticatedContext("alice").storage();
    const file = ref(storage, "alice/stickers/a.png");
    await assertSucceeds(uploadBytes(file, bytes(100), png));
    await assertSucceeds(getBytes(file));
  });

  it("denies other users and anonymous visitors", async () => {
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext("bob").storage(), "alice/stickers/b.png"),
        bytes(10),
        png,
      ),
    );
    await assertFails(
      uploadBytes(
        ref(env.unauthenticatedContext().storage(), "alice/stickers/c.png"),
        bytes(10),
        png,
      ),
    );
    await assertFails(
      getBytes(ref(env.authenticatedContext("bob").storage(), "alice/stickers/a.png")),
    );
  });

  it("lets the owner replace a sticker file (redo the edge)", async () => {
    const storage = env.authenticatedContext("alice").storage();
    const file = ref(storage, "alice/stickers/replace.webp");
    await assertSucceeds(uploadBytes(file, bytes(10), { contentType: "image/webp" }));
    await assertSucceeds(uploadBytes(file, bytes(20), { contentType: "image/webp" }));
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext("bob").storage(), "alice/stickers/replace.webp"),
        bytes(20),
        {
          contentType: "image/webp",
        },
      ),
    );
  });

  it("accepts WebP stickers", async () => {
    const storage = env.authenticatedContext("alice").storage();
    await assertSucceeds(
      uploadBytes(ref(storage, "alice/stickers/w.webp"), bytes(100), {
        contentType: "image/webp",
      }),
    );
  });

  it("keeps a sticker's small picture small, and WebP", async () => {
    const storage = env.authenticatedContext("alice").storage();
    const webp = { contentType: "image/webp" };
    await assertSucceeds(
      uploadBytes(ref(storage, "alice/stickers/s1_t.webp"), bytes(20 * 1024), webp),
    );
    await assertSucceeds(
      uploadBytes(ref(storage, "alice/stickers/s1_123_t.webp"), bytes(100 * 1024), webp),
    );
    // a "small" picture over 100 kB, or not WebP, is refused; a full sticker of that size is fine
    await assertFails(
      uploadBytes(ref(storage, "alice/stickers/s2_t.webp"), bytes(100 * 1024 + 1), webp),
    );
    await assertFails(
      uploadBytes(ref(storage, "alice/stickers/s3_t.webp"), bytes(10), png),
    );
    await assertSucceeds(
      uploadBytes(ref(storage, "alice/stickers/s4.webp"), bytes(300 * 1024), webp),
    );
    // only the owner
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext("bob").storage(), "alice/stickers/s5_t.webp"),
        bytes(10),
        webp,
      ),
    );
  });

  it("rejects non-image and oversized files", async () => {
    const storage = env.authenticatedContext("alice").storage();
    await assertFails(
      uploadBytes(ref(storage, "alice/stickers/d.png"), bytes(10), {
        contentType: "text/html",
      }),
    );
    await assertFails(
      uploadBytes(ref(storage, "alice/stickers/f.png"), bytes(11 * 1024 * 1024), png),
    );
    await assertFails(
      uploadBytes(ref(storage, "alice/stickers/g.webp"), bytes(3 * 1024 * 1024), {
        contentType: "image/webp",
      }),
    );
    await assertFails(
      uploadBytes(ref(storage, "alice/stickers/h.gif"), bytes(10), {
        contentType: "image/gif",
      }),
    );
  });

  it("accepts a PNG up to 10 MB", async () => {
    const storage = env.authenticatedContext("alice").storage();
    await assertSucceeds(
      uploadBytes(ref(storage, "alice/stickers/big.png"), bytes(9 * 1024 * 1024), png),
    );
  });

  it("denies uploads into another user's sticker folder", async () => {
    const storage = env.authenticatedContext("bob").storage();
    await assertFails(uploadBytes(ref(storage, "alice/stickers/x.png"), bytes(10), png));
  });
});

describe("listing and deleting (account deletion)", () => {
  it("lets the owner list and delete their files, but not list someone else's", async () => {
    const alice = env.authenticatedContext("alice").storage();
    await uploadBytes(ref(alice, "alice/stickers/x.png"), bytes(10), png);
    await uploadBytes(ref(alice, "alice/profile/profile_pic/me.jpg"), bytes(10), {
      contentType: "image/jpeg",
    });
    await assertSucceeds(listAll(ref(alice, "alice/stickers")));
    await assertSucceeds(listAll(ref(alice, "alice/profile/profile_pic")));
    await assertSucceeds(deleteObject(ref(alice, "alice/stickers/x.png")));
    await assertFails(
      listAll(ref(env.authenticatedContext("bob").storage(), "alice/stickers")),
    );
    await assertFails(
      deleteObject(
        ref(env.authenticatedContext("bob").storage(), "alice/stickers/x.png"),
      ),
    );
  });
});

describe("profile pictures", () => {
  it("accepts a profile picture as png, jpeg or webp, and nothing else (no SVG or HTML)", async () => {
    const storage = env.authenticatedContext("alice").storage();
    for (const [name, contentType] of [
      ["a.png", "image/png"],
      ["a.jpg", "image/jpeg"],
      ["a.webp", "image/webp"],
    ] as const)
      await assertSucceeds(
        uploadBytes(ref(storage, `alice/profile/profile_pic/${name}`), bytes(100), {
          contentType,
        }),
      );
    for (const [name, contentType] of [
      ["a.svg", "image/svg+xml"],
      ["a.html", "text/html"],
      ["a.gif", "image/gif"],
      ["a.txt", "text/plain"],
    ] as const)
      await assertFails(
        uploadBytes(ref(storage, `alice/profile/profile_pic/${name}`), bytes(100), {
          contentType,
        }),
      );
  });

  it("lets the owner upload an image under 5 MB", async () => {
    const storage = env.authenticatedContext("alice").storage();
    await assertSucceeds(
      uploadBytes(ref(storage, "alice/profile/profile_pic/me.jpg"), bytes(1000), {
        contentType: "image/jpeg",
      }),
    );
    await assertFails(
      uploadBytes(
        ref(storage, "alice/profile/profile_pic/big.jpg"),
        bytes(6 * 1024 * 1024),
        {
          contentType: "image/jpeg",
        },
      ),
    );
  });

  it("denies writes into another user's folder", async () => {
    await assertFails(
      uploadBytes(
        ref(
          env.authenticatedContext("bob").storage(),
          "alice/profile/profile_pic/me.jpg",
        ),
        bytes(10),
        {
          contentType: "image/jpeg",
        },
      ),
    );
  });
});

describe("everything else", () => {
  it("is denied", async () => {
    const storage = env.authenticatedContext("alice").storage();
    await assertFails(uploadBytes(ref(storage, "alice/other/file.png"), bytes(10), png));
    await assertFails(uploadBytes(ref(storage, "random.png"), bytes(10), png));
  });
});

describe("journals, shares and workspaces", () => {
  for (const folder of ["journals", "shares", "collab"]) {
    it(`${folder}: the owner uploads pictures and reads them back; nobody else does`, async () => {
      const mine = env.authenticatedContext("alice").storage();
      const file = ref(mine, `alice/${folder}/x/a.webp`);
      await assertSucceeds(uploadBytes(file, bytes(100), { contentType: "image/webp" }));
      await assertSucceeds(getBytes(file));
      await assertFails(
        getBytes(
          ref(env.authenticatedContext("bob").storage(), `alice/${folder}/x/a.webp`),
        ),
      );
      await assertFails(
        uploadBytes(
          ref(env.authenticatedContext("bob").storage(), `alice/${folder}/x/b.webp`),
          bytes(10),
          { contentType: "image/webp" },
        ),
      );
      await assertFails(
        uploadBytes(ref(mine, `alice/${folder}/x/c.html`), bytes(10), {
          contentType: "text/html",
        }),
      );
      await assertSucceeds(deleteObject(file));
    });
  }
  it("an unknown folder is denied", async () => {
    const mine = env.authenticatedContext("alice").storage();
    await assertFails(
      uploadBytes(ref(mine, "alice/misc/a.webp"), bytes(10), {
        contentType: "image/webp",
      }),
    );
  });
});
