import { deleteObject, listAll, ref, type StorageReference } from "firebase/storage";
import { storage } from "./firebase";

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

/** Remove every file under a Storage folder, including orphans with no Firestore document. */
export async function deleteFolder(path: string): Promise<void> {
  const { items, prefixes } = await listAll(ref(storage, path));
  await Promise.all(items.map((item) => deleteFileIfExists(item)));
  await Promise.all(prefixes.map((prefix) => deleteFolder(prefix.fullPath)));
}
