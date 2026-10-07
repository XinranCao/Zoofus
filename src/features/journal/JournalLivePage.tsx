import { JournalCanvas } from "./JournalCanvas";
import type { Journal } from "./journal.schema";
import { useStickerResolver } from "./stickerRegistry";

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
  return (
    <span className="zf-jtile__live" style={{ display: "block", width: "100%" }}>
      <JournalCanvas
        page={journal.page}
        items={journal.items}
        resolve={resolve}
        width={width}
      />
    </span>
  );
}
