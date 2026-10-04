import { doc, getDoc } from "firebase/firestore";
import {
  deleteObject,
  getBlob,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { getToken } from "firebase/app-check";
import { appCheck, auth, db, storage, useEmulators } from "./firebase";
import { env } from "./env";
import { codeOf } from "./diagnostics";

export interface CheckResult {
  name: string;
  ok: boolean;
  /** `skipped` when the check does not apply (App Check against the emulators, not signed in). */
  skipped?: boolean;
  ms: number;
  detail: string;
  code?: string;
}

const PNG_1PX = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

async function timed(
  name: string,
  run: () => Promise<string>,
  limitMs = 20_000,
): Promise<CheckResult> {
  const t0 = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const detail = await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(Object.assign(new Error("no answer"), { code: "timeout" })),
          limitMs,
        );
      }),
    ]);
    return { name, ok: true, ms: Math.round(performance.now() - t0), detail };
  } catch (err) {
    return {
      name,
      ok: false,
      ms: Math.round(performance.now() - t0),
      detail: err instanceof Error ? err.message : String(err),
      code: codeOf(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

const skip = (name: string, detail: string): CheckResult => ({
  name,
  ok: true,
  skipped: true,
  ms: 0,
  detail,
});

/** The payload of an App Check token (a JWT) without checking it: who it says it is for, and when it ends. */
export function readToken(token: string): {
  app?: string;
  audience?: string;
  expires?: string;
} {
  try {
    const part = token.split(".")[1] ?? "";
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const p = JSON.parse(json) as { sub?: string; aud?: string[] | string; exp?: number };
    return {
      app: p.sub,
      audience: Array.isArray(p.aud) ? p.aud.join(", ") : p.aud,
      expires: p.exp ? new Date(p.exp * 1000).toISOString() : undefined,
    };
  } catch {
    return {};
  }
}

/** Does the browser get an App Check token, and is it for this app? */
export async function checkAppCheck(): Promise<CheckResult> {
  if (!appCheck)
    return skip(
      "App Check token",
      useEmulators
        ? "off (emulators ignore App Check)"
        : "off (no site key in this build)",
    );
  return timed("App Check token", async () => {
    const { token } = await getToken(appCheck!, true);
    const t = readToken(token);
    const mine = env.VITE_APP_APP_ID;
    const match =
      t.app === mine
        ? "matches this build's app id"
        : `DIFFERS from this build's app id (${mine})`;
    return `token for app ${t.app} (${match}); project ${t.audience}; ends ${t.expires}`;
  });
}

/** Reads the signed-in person's own profile document: tests Auth, App Check and Firestore together. */
export async function checkFirestore(): Promise<CheckResult> {
  const uid = auth.currentUser?.uid;
  if (!uid) return skip("Firestore read", "sign in first");
  return timed("Firestore read", async () => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? "own profile read" : "answered (no profile document)";
  });
}

/** Writes a 1-pixel picture to the person's own folder, reads it back by link and by SDK, and deletes it. */
export async function checkStorage(): Promise<CheckResult[]> {
  const uid = auth.currentUser?.uid;
  if (!uid)
    return [
      skip("Storage write", "sign in first"),
      skip("Storage read", "sign in first"),
    ];
  const file = ref(storage, `${uid}/shares/_diagnostics.png`);
  const write = await timed("Storage write", async () => {
    await uploadBytes(file, PNG_1PX, { contentType: "image/png" });
    return "uploaded a 1-pixel picture";
  });
  if (!write.ok) return [write, skip("Storage read", "needs the write to work")];
  const read = await timed("Storage read", async () => {
    const link = await getDownloadURL(file);
    const viaFetch = await fetch(link, { cache: "reload" })
      .then((r) => (r.ok ? "ok" : `HTTP ${r.status}`))
      .catch((e: Error) => `failed (${e.message})`);
    const viaSdk = await getBlob(file).then(
      () => "ok",
      (e: Error) => `failed (${codeOf(e) ?? e.message})`,
    );
    if (viaFetch !== "ok" || viaSdk !== "ok")
      throw Object.assign(new Error(`by link: ${viaFetch}; by SDK: ${viaSdk}`), {
        code: "storage/read",
      });
    return "read back by link and by SDK";
  });
  await deleteObject(file).catch(() => {});
  return [write, read];
}

export async function runAllChecks(): Promise<CheckResult[]> {
  return [await checkAppCheck(), await checkFirestore(), ...(await checkStorage())];
}
