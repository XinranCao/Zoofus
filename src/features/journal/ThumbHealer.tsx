import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { isLite } from "@/lib/lite";
import type { Journal } from "./journal.schema";
import { recentlyFailed } from "./healMemory";
import { useJournals } from "./useJournals";

/** At most this many pictures are made in one visit, one after the other (fewer on a slow computer). */
const perVisit = () => (isLite() ? 3 : 12);

// loaded only when a page picture is needed (it brings Konva with it)
const ThumbMaker = lazy(() => import("./ThumbMaker"));

/**
 * A journal saved before its page picture could be made (or one that was never opened again) has
 * only its paper in lists, collections and shares. This draws such a page once, out of sight, and
 * keeps the picture, so every list shows the page without drawing it again.
 */
export function ThumbHealer() {
  const { currentUser } = useAuth();
  // heals what some other screen has already loaded; it never reads the journals itself
  const { data } = useJournals({ read: false });
  const tried = useRef(new Set<string>());
  const [current, setCurrent] = useState<Journal | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (current || !currentUser || !data || tried.current.size >= perVisit()) return;
    const next = data.find(
      (j) =>
        !j.thumbUrl &&
        j.items.length > 0 &&
        !tried.current.has(j.id) &&
        !recentlyFailed(j.id) &&
        !pathname.includes(j.id), // not the one being edited just now
    );
    if (!next) return;
    // after the page has settled, so it never competes with what the person is doing
    const timer = setTimeout(() => {
      tried.current.add(next.id);
      setCurrent(next);
    }, 1500);
    return () => clearTimeout(timer);
  }, [data, current, currentUser, pathname]);

  if (!current || !currentUser) return null;
  return (
    <Suspense fallback={null}>
      <ThumbMaker
        key={current.id}
        uid={currentUser.uid}
        journal={current}
        onDone={() => setCurrent(null)}
      />
    </Suspense>
  );
}
