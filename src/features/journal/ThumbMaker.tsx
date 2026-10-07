import { useEffect, useRef } from "react";
import type Konva from "konva";
import { useQueryClient } from "@tanstack/react-query";
import { setJournalThumb } from "./journal.api";
import type { Journal } from "./journal.schema";
import { exportStage } from "./exportStage";
import { JournalCanvas } from "./JournalCanvas";
import { useStickerResolver } from "./stickerRegistry";
import { rememberFailure } from "./healMemory";
import { patchJournal } from "./useJournals";

const WIDTH = 480;

/**
 * Draws one journal's page out of sight and keeps the picture. It is its own file because it pulls
 * in the whole drawing stack (Konva): `ThumbHealer` loads it only when a journal needs a picture,
 * so the sign-in page does not download it.
 */
export default function ThumbMaker({
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
        const saved = await setJournalThumb(uid, journal, blob);
        // only this one picture changed: patch the list instead of reading every journal again
        qc.setQueryData<Journal[]>(["journals", uid], (list) =>
          patchJournal(list, journal.id, saved, false),
        );
      } catch (err) {
        console.warn("Could not make a page picture for a journal", err);
        rememberFailure(journal.id);
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
