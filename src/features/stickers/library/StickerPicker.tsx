import { useTranslation } from "react-i18next";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Loader";
import { cn } from "@/lib/cn";
import { StickerImage } from "./StickerTile";
import type { Sticker } from "./sticker.schema";
import { useStickers, useStickerThumbHealing } from "./useStickers";

/**
 * A dialog that lists your stickers to choose from (one tap picks). Used wherever a sticker is
 * needed: a profile picture, a journal page, a collection.
 */
export function StickerPickerDialog({
  open,
  onClose,
  onPick,
  title,
  stickers: given,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (sticker: Sticker) => void;
  title?: string;
  /** Choose from this list instead of the whole library. */
  stickers?: Sticker[];
}) {
  const { t } = useTranslation();
  const { data, isPending } = useStickers();
  const list = given ?? data ?? [];
  useStickerThumbHealing(open ? list : undefined);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={760}
      sheet
      seed="picker"
      tapes={1}
      title={title ?? t("picker.title")}
    >
      <div style={{ margin: "12px 0 6px" }}>
        {isPending && !given ? (
          <div className="zf-grid-picker" aria-busy="true">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} seed={"psk" + i} width="100%" height={110} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState seed="picker-empty" title={t("picker.empty")} />
        ) : (
          <ul
            className="zf-grid-picker"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={cn("zf-picker__item")}
                  aria-label={s.name}
                  onClick={() => onPick(s)}
                >
                  <StickerImage sticker={s} size={84} rotate={3} interactive />
                  <span className="zf-tile__meta">{s.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
