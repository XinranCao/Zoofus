import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { isLite } from "@/lib/lite";
import { setJournalThumb } from "./journal.api";
import type { Journal } from "./journal.schema";
import { exportStage } from "./exportStage";
import { JournalCanvas } from "./JournalCanvas";
import { useStickerResolver } from "./stickerRegistry";
import { useJournals } from "./useJournals";

/** At most this many pictures are made in one visit, one after the other (fewer on a slow computer). */
const perVisit = () => (isLite() ? 3 : 12);
const WIDTH = 480;

/**
 * A journal saved before its page picture could be made (or one that was never opened again) has
 * only its paper in lists, collections and shares. This draws such a page once, out of sight, and
 * keeps the picture, so every list shows the page without drawing it again.
 */
export function ThumbHealer() {
  const { currentUser } = useAuth();
  const { data } = useJournals();
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
    <Maker
      key={current.id}
      uid={currentUser.uid}
      journal={current}
      onDone={() => setCurrent(null)}
    />
  );
}

function Maker({
  uid,
  journal,
  onDone,
}: {
  uid: string;
  journal: Journal;
  onDone: () => void;
}) {
  const stage = useRef<Konva.Stage>(null);
  const qc = useQueryClient();
  const resolve = useStickerResolver(journal.assets);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        // wait until every picture on the page has loaded (up to 6 s), and the fonts
        await document.fonts?.ready;
        const t0 = Date.now();
        const ready = () => {
          const st = stage.current;
          if (!st) return false;
          return st.find("Image").every((n) => {
            const img = (n as Konva.Image).image() as HTMLImageElement | undefined;
            return !!img && img.complete !== false;
          });
        };
        while (alive && !ready() && Date.now() - t0 < 6000)
          await new Promise((r) => setTimeout(r, 150));
        await new Promise((r) => setTimeout(r, 250)); // one more look at the drawn page
        const st = stage.current;
        if (!alive || !st) return;
        const blob = await exportStage(st, journal.page.width, WIDTH, 0.8, "image/webp");
        if (!alive) return;
        await setJournalThumb(uid, journal, blob);
        await qc.invalidateQueries({ queryKey: ["journals", uid] });
      } catch (err) {
        console.warn("Could not make a page picture for a journal", err);
      } finally {
        if (alive) setTimeout(onDone, 800);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per journal
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: WIDTH,
        pointerEvents: "none",
      }}
    >
      <JournalCanvas
        page={journal.page}
        items={journal.items}
        resolve={resolve}
        width={WIDTH}
        stageRef={stage}
      />
    </div>
  );
}
