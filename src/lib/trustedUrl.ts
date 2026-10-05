import { z } from "zod";

// (reads import.meta.env directly, not through `env`, which refuses to load without the Firebase keys)
const EMULATOR_STORAGE_PORT = "9199";

/** This project's bucket under both of its names (`x.firebasestorage.app` and `x.appspot.com`). */
function ownBuckets(bucket: string): string[] {
  const base = bucket.replace(/\.(firebasestorage\.app|appspot\.com)$/, "");
  return [bucket, `${base}.firebasestorage.app`, `${base}.appspot.com`];
}

/**
 * A picture link may come from another user's data (a share, a workspace item), so the app only
 * follows links that point at this project's own Storage bucket (or, against the local emulators,
 * the emulator's Storage), or at a `data:` image. Anything else (another host, `http:`,
 * `javascript:`, `file:`) is refused before a request is made.
 */
export function isTrustedPictureUrl(link: string): boolean {
  if (/^data:image\//i.test(link)) return true;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return false;
  }
  const bucket = import.meta.env.VITE_APP_STORAGE_BUCKET as string | undefined;
  if (
    url.protocol === "https:" &&
    url.hostname === "firebasestorage.googleapis.com" &&
    bucket &&
    ownBuckets(bucket).some((b) => url.pathname.startsWith(`/v0/b/${b}/o/`))
  )
    return true;
  return (
    import.meta.env.VITE_USE_EMULATORS === "true" &&
    url.protocol === "http:" &&
    url.port === EMULATOR_STORAGE_PORT &&
    url.pathname.startsWith("/v0/b/")
  );
}

/** The link if it is one the app trusts, else "" (a placeholder shows). For data a friend can write. */
export function safePictureUrl(link: string | null | undefined): string {
  return link && isTrustedPictureUrl(link) ? link : "";
}

/** `safePictureUrl`, and also a `blob:` link the page itself made (a photo being edited). For display. */
export function safeDisplayUrl(link: string | null | undefined): string {
  if (!link) return "";
  return link.startsWith("blob:") ? link : safePictureUrl(link);
}

/** Throws a friendly, coded error for a link the app does not trust. */
export function assertTrustedPictureUrl(link: string): void {
  if (!isTrustedPictureUrl(link))
    throw Object.assign(
      new Error("This picture comes from an address that is not allowed."),
      {
        code: "picture/untrusted-url",
      },
    );
}

/** A picture link in data a friend can write: anything untrusted reads as "" (no picture). */
export const pictureUrlSchema = z.string().transform(safePictureUrl);
