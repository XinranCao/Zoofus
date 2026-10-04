/**
 * Turn a `clip-path: polygon(...)` string made by `tornClip` / `tapeEnds` into points, so the same
 * shape can be cut on a canvas. Understands `12px`, `34%`, `calc(100% - 5px)` and `none`.
 */
export type Pt = [number, number];

const length = (token: string, full: number): number => {
  const calc = token.match(/^calc\(100% - ([\d.]+)px\)$/);
  if (calc) return full - parseFloat(calc[1]!);
  if (token.endsWith("%")) return (parseFloat(token) / 100) * full;
  return parseFloat(token);
};

export function clipPolygon(clip: string, width: number, height: number): Pt[] | null {
  const m = clip.trim().match(/^polygon\(([\s\S]*)\)$/);
  if (!m) return null;
  const points = m[1]!.split(/,(?![^(]*\))/).map((p) => p.trim());
  const out: Pt[] = [];
  for (const p of points) {
    const tokens = p.match(/calc\([^)]*\)|\S+/g);
    if (!tokens || tokens.length < 2) return null;
    const x = length(tokens[0]!, width);
    const y = length(tokens[1]!, height);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    out.push([x, y]);
  }
  return out;
}
