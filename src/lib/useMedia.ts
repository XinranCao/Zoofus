import { useSyncExternalStore } from "react";

/** Whether a media query matches now, and again whenever it changes (false where there is no window). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const m = typeof window !== "undefined" ? window.matchMedia?.(query) : undefined;
      m?.addEventListener?.("change", notify);
      return () => m?.removeEventListener?.("change", notify);
    },
    () =>
      typeof window !== "undefined" ? Boolean(window.matchMedia?.(query).matches) : false,
    () => false,
  );
}

/** A phone-width screen: where the studios shrink their parts and fold options into drop-downs. */
export const PHONE_QUERY = "(max-width: 759px)";
