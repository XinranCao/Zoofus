import { deleteObject, type StorageReference } from "firebase/storage";

/** Delete a file, treating "already gone" as success so cleanup can always finish. */
export async function deleteFileIfExists(
  fileRef: StorageReference,
  remove: typeof deleteObject = deleteObject,
): Promise<void> {
  try {
    await remove(fileRef);
  } catch (err) {
    if ((err as { code?: string }).code !== "storage/object-not-found") throw err;
  }
}
