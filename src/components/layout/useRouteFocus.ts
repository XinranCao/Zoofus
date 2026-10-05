import { useEffect, useRef } from "react";

/** The page's own heading if it has one, else the main landmark itself (`tabindex="-1"`). */
function target(): HTMLElement | null {
  const main = document.getElementById("main");
  if (!main) return null;
  return main.querySelector<HTMLElement>("h1") ?? null;
}

/**
 * After a route change, move keyboard focus to the new page's heading, so a keyboard or
 * screen-reader user starts at the top of what changed instead of back at the masthead. Pages load
 * lazily, so the heading is looked for for about a second. Does nothing on first load, and leaves
 * focus alone if it is already inside the page (a field that took focus itself) or a dialog is open.
 */
export function useRouteFocus(pathname: string) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let frame = 0;
    let tries = 0;
    const seek = () => {
      // a dialog that is open has the focus (it may have opened from the address, e.g. ?make=1)
      if (document.querySelector('[role="dialog"]')) return;
      const main = document.getElementById("main");
      const active = document.activeElement;
      if (main && active && active !== main && main.contains(active)) return;
      const heading = target();
      if (heading) {
        if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: false });
        return;
      }
      if (++tries < 60) frame = requestAnimationFrame(seek);
      else main?.focus();
    };
    frame = requestAnimationFrame(seek);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
}
