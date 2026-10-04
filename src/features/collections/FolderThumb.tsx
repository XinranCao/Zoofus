import type { CSSProperties } from "react";
import { Paper } from "@/components/ui/Paper";
import { Tape } from "@/components/ui/Tape";
import { PaperPreview } from "@/features/journal/PageSetup";
import type { PageSpec } from "@/features/journal/journal.schema";
import type { TapeSpec } from "@/features/tape/tape.schema";
import { rng } from "@/paper/random";

/** How far (in px) and in which direction each piece flies out when you point at the folder. */
const OUT = [
  [-34, -18],
  [34, -16],
  [-8, -34],
  [-40, 6],
  [40, 8],
] as const;

/** What lies in a folder: a sticker's picture, a journal (its picture or, until it has one, its paper), a tape. */
export type FolderPiece =
  | { k: "img"; src: string }
  | { k: "paper"; page: PageSpec }
  | { k: "tape"; tape: TapeSpec };

/**
 * A folder with some of its pictures lying in it, each at its own angle. Point at it (or focus its
 * link) and they spring out a short way in every direction, then settle back. Pure decoration:
 * the folder's name and count carry the meaning.
 */
export function FolderThumb({ id, pieces }: { id: string; pieces: FolderPiece[] }) {
  const shown = pieces.slice(0, 5);
  const R = rng("fold" + id);
  return (
    <span className="zf-fold" aria-hidden="true">
      <Paper
        seed={"fb" + id}
        size="md"
        tone="scrap-warm"
        rotate={0.8}
        w={190}
        h={140}
        className="zf-fold__back"
        faceStyle={{ height: "100%" }}
      >
        {null}
      </Paper>
      <span className="zf-fold__items">
        {shown.map((piece, i) => {
          const [fx, fy] = OUT[i % OUT.length]!;
          const style = {
            "--x": `${(R() - 0.5) * 36}%`,
            "--y": `${(R() - 0.5) * 20}%`,
            "--r": `${(R() - 0.5) * 44}deg`,
            "--fx": `${fx}px`,
            "--fy": `${fy}px`,
            "--fr": `${(R() - 0.5) * 24}deg`,
            "--d": `${i * 25}ms`,
            zIndex: i,
          } as CSSProperties;
          if (piece.k === "img")
            return (
              <img
                key={i}
                className="zf-fold__item"
                src={piece.src}
                alt=""
                loading="lazy"
                decoding="async"
                style={style}
              />
            );
          if (piece.k === "paper")
            return (
              <span key={i} className="zf-fold__item zf-fold__paper" style={style}>
                <PaperPreview page={piece.page} width={44} />
              </span>
            );
          return (
            <span key={i} className="zf-fold__item zf-fold__tape" style={style}>
              <Tape
                pattern={piece.tape.pattern}
                length={64}
                thickness={Math.min(piece.tape.thickness, 20)}
                opacity={piece.tape.opacity}
                ends={piece.tape.ends}
                angle={0}
                x="50%"
                y="50%"
                seed={`ft${i}`}
              />
            </span>
          );
        })}
      </span>
      <Paper
        seed={"ff" + id}
        size="md"
        tone="scrap"
        rotate={0.8}
        w={190}
        h={90}
        className="zf-fold__front"
        faceStyle={{ height: "100%" }}
      >
        {null}
      </Paper>
    </span>
  );
}
