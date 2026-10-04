import type { ReactNode } from "react";
import { Sticker } from "./Sticker";
import type { ArtName } from "./art";

/**
 * The top of a page: the title, an optional line under it, the page's own actions on the right,
 * and a small die-cut sticker beside the title that belongs to the page (a decoration, never a
 * control). The title always starts at the same place, so it does not jump between pages.
 */
export function PageHeader({
  title,
  lead,
  actions,
  art,
  id,
}: {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  /** A sticker art that suits the page; only the first is shown, beside the title. */
  art?: ArtName[];
  id?: string;
}) {
  return (
    <header className="zf-pageheader">
      <div className="zf-pageheader__text">
        <div className="zf-pageheader__title">
          {art?.[0] && (
            <Sticker art={art[0]} size={44} rotate={4} seed={`ph-${art[0]}`} />
          )}
          <h1 className="zf-display" id={id} style={{ margin: 0 }}>
            {title}
          </h1>
        </div>
        {lead && (
          <p className="zf-muted" style={{ margin: "8px 0 0", maxWidth: 560 }}>
            {lead}
          </p>
        )}
      </div>
      {actions && <div className="zf-pageheader__side">{actions}</div>}
    </header>
  );
}
