import type { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  order: [] as string[],
  listAll: vi.fn(),
  deleteObject: vi.fn(),
  deleteUser: vi.fn(),
  deleteDoc: vi.fn(),
  reauthCredential: vi.fn(),
  reauthPopup: vi.fn(),
  listStickers: vi.fn(),
  deleteSticker: vi.fn(),
  social: Object.fromEntries(
    [
      "cancelRequest",
      "declineRequest",
      "dismissShare",
      "listFriends",
      "listIncoming",
      "listInbox",
      "listSent",
      "listSentShares",
      "cleanFinishedShares",
      "removeFriend",
      "removePublicProfile",
      "unshare",
      "declineInvite",
      "deleteWorkspace",
      "leaveWorkspace",
      "listWorkspaces",
      "listCollections",
      "deleteCollection",
      "listJournals",
      "deleteJournal",
      "listTapes",
      "deleteTape",
    ].map((k) => [k, vi.fn()]),
  ) as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock("@/lib/firebase", () => ({ db: {}, storage: {} }));
vi.mock("firebase/auth", () => ({
  EmailAuthProvider: {
    PROVIDER_ID: "password",
    credential: vi.fn((e: string, p: string) => ({ e, p })),
  },
  GoogleAuthProvider: class {},
  deleteUser: m.deleteUser,
  reauthenticateWithCredential: m.reauthCredential,
  reauthenticateWithPopup: m.reauthPopup,
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => "profileDoc"),
  deleteDoc: m.deleteDoc,
}));
vi.mock("firebase/storage", () => ({
  ref: vi.fn((_s: unknown, path: string) => ({ fullPath: path })),
  listAll: m.listAll,
  deleteObject: m.deleteObject,
}));
vi.mock("@/features/stickers/library/stickers.api", () => ({
  listStickers: m.listStickers,
  deleteSticker: m.deleteSticker,
}));
vi.mock("@/features/social/social.api", () => m.social);
vi.mock("@/features/social/share.api", () => m.social);
vi.mock("@/features/together/workspace.api", () => m.social);
vi.mock("@/features/collections/collections.api", () => m.social);
vi.mock("@/features/journal/journal.api", () => m.social);
vi.mock("@/features/tape/tape.api", () => m.social);
vi.mock("@/features/profile/profile.api", () => ({ fetchProfile: vi.fn() }));

import { deleteAccount, reauthenticate, usesPassword } from "./account.api";

const user = (providerId: string) =>
  ({ uid: "u1", email: "a@b.c", providerData: [{ providerId }] }) as unknown as User;

beforeEach(() => {
  vi.clearAllMocks();
  m.order.length = 0;
  m.listStickers.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
  for (const f of Object.values(m.social)) f.mockResolvedValue([]);
  m.social.listWorkspaces.mockResolvedValue({ mine: [], invites: [] });
  m.social.listTapes.mockResolvedValue([{ id: "t1" }]);
  m.social.deleteTape.mockImplementation(async () => void m.order.push("tape"));
  m.social.removePublicProfile.mockImplementation(
    async () => void m.order.push("public"),
  );
  m.deleteSticker.mockImplementation(async () => void m.order.push("sticker"));
  m.listAll.mockResolvedValue({ items: [{ fullPath: "f" }], prefixes: [] });
  m.deleteObject.mockImplementation(async () => void m.order.push("file"));
  m.deleteDoc.mockImplementation(async () => void m.order.push("profile"));
  m.deleteUser.mockImplementation(async () => void m.order.push("auth-user"));
});

describe("deleteAccount", () => {
  it("removes data first and the Auth user last", async () => {
    await deleteAccount(user("password"));
    expect(m.order.at(-1)).toBe("auth-user");
    expect(m.order.at(-2)).toBe("profile");
    expect(m.order.filter((x) => x === "sticker")).toHaveLength(2);
    expect(m.order).toContain("tape");
    expect(m.order.indexOf("public")).toBeLessThan(m.order.indexOf("profile"));
    expect(m.order).toContain("file");
  });

  it("sweeps both Storage folders, including orphaned files", async () => {
    await deleteAccount(user("password"));
    const listed = m.listAll.mock.calls.map((c) => c[0].fullPath);
    expect(listed).toEqual([
      "u1/stickers",
      "u1/journals",
      "u1/shares",
      "u1/collab",
      "u1/profile/profile_pic",
    ]);
  });

  it("does not delete the Auth user if removing data failed", async () => {
    m.deleteSticker.mockRejectedValue(new Error("network"));
    await expect(deleteAccount(user("password"))).rejects.toThrow("network");
    expect(m.deleteUser).not.toHaveBeenCalled();
    expect(m.deleteDoc).not.toHaveBeenCalled();
  });

  it("keeps going when a file is already gone", async () => {
    m.deleteObject.mockRejectedValue({ code: "storage/object-not-found" });
    await expect(deleteAccount(user("password"))).resolves.toBeUndefined();
    expect(m.deleteUser).toHaveBeenCalled();
  });
});

describe("deleteAccount, social side", () => {
  it("ends owned pages, leaves others, and removes friends and shares", async () => {
    m.social.listWorkspaces.mockResolvedValue({
      mine: [
        { id: "w1", ownerUid: "u1" },
        { id: "w2", ownerUid: "u2" },
      ],
      invites: [{ id: "w3" }],
    });
    m.social.listFriends.mockResolvedValue([{ uid: "f1" }]);
    m.social.listSentShares.mockResolvedValue([{ id: "x", to: "f1", files: ["a"] }]);
    await deleteAccount(user("password"));
    expect(m.social.deleteWorkspace).toHaveBeenCalledWith("u1", "w1");
    expect(m.social.leaveWorkspace).toHaveBeenCalledWith("u1", "w2");
    expect(m.social.declineInvite).toHaveBeenCalledWith("u1", "w3");
    expect(m.social.removeFriend).toHaveBeenCalledWith("u1", "f1");
    expect(m.social.unshare).toHaveBeenCalledWith("u1", "f1", "x", ["a"]);
  });
});

describe("reauthenticate", () => {
  it("uses the password for email accounts", async () => {
    await reauthenticate(user("password"), "secret1");
    expect(m.reauthCredential).toHaveBeenCalled();
    expect(m.reauthPopup).not.toHaveBeenCalled();
  });

  it("requires a password for email accounts", async () => {
    await expect(reauthenticate(user("password"))).rejects.toThrow(/Password/);
  });

  it("uses a Google popup otherwise", async () => {
    await reauthenticate(user("google.com"));
    expect(m.reauthPopup).toHaveBeenCalled();
    expect(m.reauthCredential).not.toHaveBeenCalled();
  });
});

describe("usesPassword", () => {
  it("detects the email/password provider", () => {
    expect(usesPassword(user("password"))).toBe(true);
    expect(usesPassword(user("google.com"))).toBe(false);
  });
});
