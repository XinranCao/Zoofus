import type { ReactNode } from "react";
import { Collage } from "@/components/ui/Collage";
import { Paper } from "@/components/ui/Paper";
import { Tape } from "@/components/ui/Tape";

/**
 * The shared auth layout. Desktop: a loose sticker collage on the left and a 440px taped card on
 * the right. Mobile: a strip of three small stickers, then the full-width card.
 */
export function AuthLayout({ seed, children }: { seed: string; children: ReactNode }) {
  return (
    <div
      className="zf-page"
      style={{
        display: "flex",
        gap: 56,
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      <div className="zf-hide-m" style={{ width: 420 }}>
        <Collage size={104} gap={22} />
      </div>
      <div className="zf-hide-d" style={{ width: "100%", marginBottom: -8 }}>
        <Collage arts={["pear", "cherry", "star"]} size={64} gap={10} />
      </div>
      <Paper
        seed={"authcard" + seed}
        size="lg"
        tone="scrap"
        rotate={0.4}
        w={440}
        h={460}
        style={{ width: 440, maxWidth: "100%" }}
        tape={<Tape seed={"at" + seed} x="50%" y="2px" color="tape-pink" />}
        faceStyle={{ padding: "30px 26px 26px" }}
      >
        {children}
      </Paper>
    </div>
  );
}
