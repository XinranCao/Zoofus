import { f1 } from "./random";
import { tornClip } from "./torn";

export type TapeEnds = "torn" | "cut" | "pinked";

/** Pinking-shear ends are a user choice only, never UI chrome. */
export function tapeEnds(seed: string, ends: TapeEnds, len: number, th: number): string {
  if (ends === "cut") return "none";
  if (ends === "pinked") {
    const n = Math.max(3, Math.round(th / 5));
    const P = ["4px 0", "calc(100% - 4px) 0"];
    let i: number;
    for (i = 1; i <= n; i++)
      P.push(
        (i % 2 ? "calc(100% - 0px) " : "calc(100% - 4px) ") + f1((i / n) * 100) + "%",
      );
    P.push("4px 100%");
    for (i = n - 1; i >= 1; i--)
      P.push((i % 2 ? "0 " : "4px ") + f1((i / n) * 100) + "%");
    return "polygon(" + P.join(",") + ")";
  }
  // torn short ends, long edges straight like real tape
  return tornClip("tp" + seed, {
    size: "xs",
    edges: "lr",
    amp: 2.6,
    res: 1.4,
    nick: 0,
    fiber: 0,
    w: len,
    h: th,
  });
}
