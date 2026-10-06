/**
 * "Lite" drawing for a computer that cannot keep up. The paper look costs something to draw (paper
 * grain on every piece, a traced focus ring, a fade on every dialog, pictures at twice the pixels),
 * and on an old Mac with an old browser that was enough to make dialogs stutter and sliders lag.
 * Lite mode keeps the shapes and drops the extras: no grain, no fade, a plain focus ring and
 * pictures drawn at one pixel per pixel.
 *
 *  - `?lite=1` turns it on and `?lite=0` off, and the choice is remembered;
 *  - otherwise it turns itself on (and stays on) when the page keeps missing its frames, or on a
 *    computer with two processor cores or fewer.
 */
const KEY = "zf-lite";

let on = false;

export const isLite = () => on;

/** How many device pixels to draw per CSS pixel in a picture made on the fly. */
export function renderScale(): number {
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  return on ? 1 : Math.min(2, dpr);
}

function apply(next: boolean) {
  on = next;
  if (typeof document !== "undefined")
    document.documentElement.classList.toggle("zf-lite", next);
}

const remembered = (): "1" | "0" | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "1" || v === "0" ? v : null;
  } catch {
    return null;
  }
};
const remember = (v: "1" | "0") => {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* the choice only lasts this visit */
  }
};

/** Frames longer than this (ms) count as a stutter; this many within the window turn lite on. */
const SLOW_FRAME = 50;
const SLOW_COUNT = 12;
const WINDOW = 6000;

/** Watch the frame rate and turn lite on when the page keeps stuttering. */
function watchFrames() {
  const slow: number[] = [];
  let last = performance.now();
  const tick = (now: number) => {
    const gap = now - last;
    last = now;
    // a hidden tab or a pause (gap over a second) says nothing about the computer
    if (gap > SLOW_FRAME && gap < 1000 && !document.hidden) {
      slow.push(now);
      while (slow.length && now - slow[0]! > WINDOW) slow.shift();
      if (slow.length >= SLOW_COUNT) {
        remember("1");
        apply(true);
        return; // stop watching
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function initLite() {
  if (typeof window === "undefined") return;
  const asked = new URLSearchParams(window.location.search).get("lite");
  if (asked === "1" || asked === "0") remember(asked);
  const saved = remembered();
  if (saved) return apply(saved === "1");
  // a browser driven by a test is not a slow computer
  if (navigator.webdriver) return;
  if ((navigator.hardwareConcurrency || 4) <= 2) return apply(true);
  watchFrames();
}

/** The graphics chip the browser reports, for a report about slowness ("" when it will not say). */
export function graphicsName(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return "no WebGL";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : "hidden by the browser";
  } catch {
    return "unknown";
  }
}
