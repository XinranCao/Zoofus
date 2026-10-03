import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadBytes } from "firebase/storage";
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

  it("rejects non-PNG and oversized files", async () => {
    const storage = env.authenticatedContext("alice").storage();
    await assertFails(
      uploadBytes(ref(storage, "alice/stickers/d.png"), bytes(10), {
        contentType: "text/html",
      }),
    );
    await assertFails(
      uploadBytes(ref(storage, "alice/stickers/e.png"), bytes(11 * 1024 * 1024), png),
    );
  });
});

describe("profile pictures", () => {
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
