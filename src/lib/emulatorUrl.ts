import { env } from "./env";

const EMULATOR_URL = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):(9199|9099|8080)\//;

/**
 * Against the local emulators, a picture's link names the machine that stored it ("localhost"),
 * which means nothing to a second device on the network that opens the app by this machine's
 * address. Links to the emulators are pointed at the host this page was loaded from instead.
 * Does nothing against the real backend.
 */
export function localizeUrl(url: string): string {
  if (env.VITE_USE_EMULATORS !== "true" || typeof window === "undefined") return url;
  const host = window.location.hostname;
  if (!host) return url;
  return url.replace(EMULATOR_URL, (_m, _h, port) => `http://${host}:${port}/`);
}

/** `localizeUrl` applied to every string inside a value (a share's payload). */
export function localizeUrls<T>(value: T): T {
  if (env.VITE_USE_EMULATORS !== "true") return value;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return localizeUrl(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype)
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(value) as T;
}
