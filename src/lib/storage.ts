import {
  deleteObject,
  getBlob,
  listAll,
  ref,
  type StorageReference,
} from "firebase/storage";
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

/**
 * Read a picture kept in Storage as a blob. A plain `fetch` can fail on a live bucket when the browser
 * already holds a copy of the file that was shown in an `<img>` (that copy came without the
 * cross-origin header, and is reused), so the cache is skipped. If that still fails, the Storage SDK
 * reads it (signed in, so it works for your own files).
 */
export async function readPicture(url: string): Promise<Blob> {
  try {
    const res = await fetch(url, { cache: "reload" });
    if (res.ok) return await res.blob();
  } catch {
    /* try the SDK */
  }
  return getBlob(ref(storage, url));
}
