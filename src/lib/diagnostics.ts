/**
 * A small flight recorder for debugging (see docs/debugging.md). It keeps the last errors and
 * App Check events in memory, shows them on /diagnostics, and counts Firebase failures in Google
 * Analytics so production problems can be seen without asking a user to open the console.
 */
export type LogKind = "error" | "warn" | "appcheck" | "info";

export interface LogEntry {
  at: number;
  kind: LogKind;
  message: string;
  /** A Firebase or app error code such as `storage/unauthorized` or `timeout/upload`. */
  code?: string;
}

const MAX_ENTRIES = 80;
const entries: LogEntry[] = [];
const listeners = new Set<() => void>();
const counted = new Set<string>();

export function getLog(): readonly LogEntry[] {
  return entries;
}

export function subscribeLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function record(kind: LogKind, message: string, code?: string): void {
  entries.push({ at: Date.now(), kind, message: message.slice(0, 400), code });
  if (entries.length > MAX_ENTRIES) entries.shift();
  listeners.forEach((fn) => fn());
  if (kind === "error" && code && !counted.has(code) && counted.size < 25) {
    counted.add(code);
    void track("app_error", { code, where: message.slice(0, 80) });
  }
}

/** Count something in Google Analytics (nothing happens against the emulators or when blocked). */
export async function track(
  name: string,
  params: Record<string, string | number>,
): Promise<void> {
  try {
    const { app, useEmulators } = await import("./firebase");
    if (useEmulators) return;
    const { getAnalytics, isSupported, logEvent } = await import("firebase/analytics");
    if (await isSupported()) logEvent(getAnalytics(app), name, params);
  } catch {
    /* analytics is optional */
  }
}

const CODE =
  /\b((?:auth|storage|functions|appCheck|timeout|share)\/[\w-]+|permission-denied|unavailable|resource-exhausted|unauthenticated|failed-precondition|deadline-exceeded)\b/;

/** The first Firebase-style error code found in an error, a message or a list of them. */
export function codeOf(value: unknown): string | undefined {
  if (value instanceof Error) {
    const c = (value as { code?: unknown }).code;
    if (typeof c === "string") return c;
    return CODE.exec(value.message)?.[1];
  }
  if (typeof value === "string") return CODE.exec(value)?.[1];
  if (Array.isArray(value)) {
    for (const v of value) {
      const c = codeOf(v);
      if (c) return c;
    }
  }
  return undefined;
}

const text = (v: unknown): string =>
  v instanceof Error
    ? `${v.name}: ${v.message}`
    : typeof v === "string"
      ? v
      : safeJson(v);
function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

let installed = false;

/** Start recording uncaught errors, unhandled promise rejections and `console.error` calls. */
export function installDiagnostics(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) =>
    record("error", e.message || "Script error", codeOf(e.error)),
  );
  window.addEventListener("unhandledrejection", (e) =>
    record("error", `Unhandled: ${text(e.reason)}`, codeOf(e.reason)),
  );
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    record("error", args.map(text).join(" "), codeOf(args));
  };
}

/** The log as plain text, newest last, for pasting into a bug report. */
export function logAsText(): string {
  return entries
    .map(
      (e) =>
        `${new Date(e.at).toISOString()} [${e.kind}]${e.code ? ` (${e.code})` : ""} ${e.message}`,
    )
    .join("\n");
}
