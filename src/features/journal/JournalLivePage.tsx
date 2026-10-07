import { JournalCanvas } from "./JournalCanvas";
import type { Journal } from "./journal.schema";
import { useStickerResolver } from "./stickerRegistry";
import { useJournalItems } from "./useJournals";

/**
 * A journal's page drawn read-only inside its list tile, for the moment before its page picture
 * exists (a page just left, or one saved before pictures were kept). It is its own file so the
 * drawing stack loads only when a tile needs it.
 */
export default function JournalLivePage({
  journal,
  width,
}: {
  journal: Journal;
  width: number;
}) {
  const resolve = useStickerResolver(journal.assets);
  // older journals carry their items; the others read them once, from their own document
  const loaded = useJournalItems(journal);
  const items = journal.slim ? (loaded.data ?? []) : journal.items;
  return (
    <span className="zf-jtile__live" style={{ display: "block", width: "100%" }}>
      <JournalCanvas page={journal.page} items={items} resolve={resolve} width={width} />
    </span>
  );
}
