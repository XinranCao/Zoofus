import type { ReactNode } from "react";
import { Collage } from "@/components/ui/Collage";
import { Paper } from "@/components/ui/Paper";
import { Tape } from "@/components/ui/Tape";

/**
 * The shared auth layout. Desktop: a loose sticker collage on the left and a 440px taped card on
 * the right (side by side from 1000px). Below that the card comes first and the sticker art after
 * it, so the form is never pushed down the page; on a phone the art is a strip of three stickers.
 */
export function AuthLayout({ seed, children }: { seed: string; children: ReactNode }) {
  return (
    <div className="zf-page zf-auth">
      <Paper
        seed={"authcard" + seed}
        size="lg"
        tone="scrap"
        rotate={0.4}
        w={440}
        h={460}
        style={{ width: 440, maxWidth: "100%" }}
        tape={<Tape seed={"at" + seed} x="50%" y="2px" color="tape-pink" />}
        faceStyle={{ padding: "34px 34px 30px" }}
      >
        {children}
      </Paper>
      <div className="zf-hide-m zf-auth__art" style={{ width: 420 }}>
        <Collage size={104} gap={22} />
      </div>
      <div className="zf-hide-d zf-auth__strip" style={{ width: "100%" }}>
        <Collage arts={["pear", "cherry", "star"]} size={64} gap={10} />
      </div>
    </div>
  );
}
