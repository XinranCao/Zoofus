import type { CSSProperties } from "react";
import { Paper } from "@/components/ui/Paper";
import { rng } from "@/paper/random";

/** How far (in px) and in which direction each piece flies out when you point at the folder. */
const OUT = [
  [-34, -18],
  [34, -16],
  [-8, -34],
  [-40, 6],
  [40, 8],
] as const;

/**
 * A folder with some of its pictures lying in it, each at its own angle. Point at it (or focus its
 * link) and they spring out a short way in every direction, then settle back. Pure decoration:
 * the folder's name and count carry the meaning.
 */
export function FolderThumb({ id, pictures }: { id: string; pictures: string[] }) {
  const shown = pictures.slice(0, 5);
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
        {shown.map((src, i) => {
          const [fx, fy] = OUT[i % OUT.length]!;
          return (
            <img
              key={src + i}
              className="zf-fold__item"
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              style={
                {
                  "--x": `${(R() - 0.5) * 36}%`,
                  "--y": `${(R() - 0.5) * 20}%`,
                  "--r": `${(R() - 0.5) * 44}deg`,
                  "--fx": `${fx}px`,
                  "--fy": `${fy}px`,
                  "--fr": `${(R() - 0.5) * 24}deg`,
                  "--d": `${i * 25}ms`,
                  zIndex: i,
                } as CSSProperties
              }
            />
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
