import { useJournalCount } from "@/features/journal/useJournals";
import { NewJournalDialog } from "@/features/journal/NewJournalDialog";
import { StickerMakerDialog } from "@/features/stickers/editor/LazyStickerMaker";
import { NewTapeDialog } from "@/features/tape/NewTapeDialog";
import { NewWorkspaceDialog } from "@/features/together/NewWorkspaceDialog";
import { useWorkspaces } from "@/features/together/useTogether";
import { useMake } from "@/lib/makeStore";

/**
 * The dialogs behind the Make menu. They open over the current page, so choosing "Sticker" while
 * you are looking at your tapes does not take you anywhere: you make it, and you are still there.
 */
export function MakeHost() {
  const open = useMake((s) => s.open);
  const close = useMake((s) => s.close);
  // only counted when the New journal dialog is open: no journal is read just to start one
  const { data: journalCount } = useJournalCount(open === "journal");
  const { data: workspaces } = useWorkspaces();
  return (
    <>
      <StickerMakerDialog open={open === "sticker"} onOpenChange={(o) => !o && close()} />
      {open === "tape" && <NewTapeDialog onClose={close} />}
      <NewJournalDialog
        open={open === "journal"}
        onClose={close}
        existing={journalCount ?? 0}
        ready={journalCount !== undefined}
      />
      <NewWorkspaceDialog
        open={open === "together"}
        onClose={close}
        existing={workspaces?.mine.length ?? 0}
      />
    </>
  );
}
