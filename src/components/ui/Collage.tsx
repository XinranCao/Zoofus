import { ART_NAMES, type ArtName } from "./art";
import { Sticker } from "./Sticker";

/** A loose cluster of stickers: the only "image" on a page. Decorative (aria-hidden). */
export function Collage({
  arts = ART_NAMES,
  size = 92,
  gap = 18,
}: {
  arts?: ArtName[];
  size?: number;
  gap?: number;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {arts.map((a, i) => (
        <Sticker key={a} art={a} size={size} seed={a + i} />
      ))}
    </div>
  );
}
