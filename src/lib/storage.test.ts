import type { StorageReference } from "firebase/storage";
import { describe, expect, it, vi } from "vitest";
import { deleteFileIfExists } from "./storage";

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
