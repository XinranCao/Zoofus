/**
 * A journal whose page picture could not be made is not tried again on every visit: the failure is
 * remembered in this browser for a day (a page that cannot be drawn today will not draw itself
 * tomorrow without an edit, and an edit gives it a new picture anyway).
 */
const KEY = "zf-heal-failed";
const DAY = 24 * 60 * 60 * 1000;

type Failed = Record<string, number>;

const read = (): Failed => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}") as unknown;
    return v && typeof v === "object" ? (v as Failed) : {};
  } catch {
    return {};
  }
};

export function recentlyFailed(id: string, now = Date.now()): boolean {
  const at = read()[id];
  return typeof at === "number" && now - at < DAY;
}

export function rememberFailure(id: string, now = Date.now()): void {
  try {
    const all = read();
    for (const [k, at] of Object.entries(all)) if (now - at >= DAY) delete all[k];
    all[id] = now;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* a convenience only */
  }
}
