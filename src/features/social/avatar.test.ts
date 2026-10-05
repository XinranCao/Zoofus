import { beforeEach, describe, expect, it, vi } from "vitest";

const sets: Array<{ path: string; data: Record<string, unknown> }> = [];

vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  collection: vi.fn(),
  deleteDoc: vi.fn(),
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => undefined }),
  getDocs: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  serverTimestamp: () => "ts",
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  where: vi.fn(),
  writeBatch: () => ({
    set: (ref: { path: string }, data: Record<string, unknown>) =>
      sets.push({ path: ref.path, data }),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { ensurePublicProfile } from "./social.api";

describe("a Google profile photo", () => {
  beforeEach(() => (sets.length = 0));
  it("never blocks the public profile: it is written with no picture", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const profile = await ensurePublicProfile("u1", {
      nickname: "Ada",
      avatarUrl: "https://lh3.googleusercontent.com/a/abc=s96-c",
    });
    const written = sets.find((s) => s.path === "publicProfiles/u1");
    expect(written?.data.avatarUrl).toBe("");
    expect(profile.friendCode).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
