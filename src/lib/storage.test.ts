import type { StorageReference } from "firebase/storage";
import { describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({ storage: {} }));
import { deleteFileIfExists, readPicture } from "./storage";

const fileRef = {} as StorageReference;

describe("deleteFileIfExists", () => {
  it("deletes the file", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    await deleteFileIfExists(fileRef, remove);
    expect(remove).toHaveBeenCalledWith(fileRef);
  });

  it("treats a missing file as already deleted", async () => {
    const remove = vi.fn().mockRejectedValue({ code: "storage/object-not-found" });
    await expect(deleteFileIfExists(fileRef, remove)).resolves.toBeUndefined();
  });

  it("still throws other errors", async () => {
    const remove = vi.fn().mockRejectedValue({ code: "storage/unauthorized" });
    await expect(deleteFileIfExists(fileRef, remove)).rejects.toMatchObject({
      code: "storage/unauthorized",
    });
  });
});

describe("readPicture", () => {
  it("reads a data: picture without fetch (the CSP blocks it)", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const blob = await readPicture("data:image/png;base64,AQID");
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(3);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
