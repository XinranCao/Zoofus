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
  listPages: vi.fn(),
  deletePage: vi.fn(),
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
vi.mock("@/features/pages/pages.api", () => ({
  listPages: m.listPages,
  deletePage: m.deletePage,
}));
vi.mock("@/features/profile/profile.api", () => ({ fetchProfile: vi.fn() }));

import { deleteAccount, reauthenticate, usesPassword } from "./account.api";

const user = (providerId: string) =>
  ({ uid: "u1", email: "a@b.c", providerData: [{ providerId }] }) as unknown as User;

beforeEach(() => {
  vi.clearAllMocks();
  m.order.length = 0;
  m.listStickers.mockResolvedValue([{ id: "s1" }, { id: "s2" }]);
  m.listPages.mockResolvedValue([{ id: "p1" }]);
  m.deleteSticker.mockImplementation(async () => void m.order.push("sticker"));
  m.deletePage.mockImplementation(async () => void m.order.push("page"));
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
    expect(m.order).toContain("page");
    expect(m.order).toContain("file");
  });

  it("sweeps both Storage folders, including orphaned files", async () => {
    await deleteAccount(user("password"));
    const listed = m.listAll.mock.calls.map((c) => c[0].fullPath);
    expect(listed).toEqual(["u1/stickers", "u1/profile/profile_pic"]);
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
