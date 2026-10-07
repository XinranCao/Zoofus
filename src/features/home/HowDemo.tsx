import { useTranslation } from "react-i18next";
import { Paper } from "@/components/ui/Paper";
import { Sticker } from "@/components/ui/Sticker";
import { Tape } from "@/components/ui/Tape";
import { artUrl } from "@/components/ui/art";

/** A hand-drawn arrow between two steps. */
function Arrow() {
  return (
    <svg className="zf-home-arrow" viewBox="0 0 36 24" aria-hidden="true">
      <path
        d="M3 13c8-4 17-5 28-1M24 5l8 7-8 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The photo with a lasso round the mug: the marching ants stop under reduced motion. */
function PhotoStep() {
  return (
    <Paper
      seed="demo-photo"
      size="sm"
      tone="sheet-50"
      rotate={1}
      faceStyle={{ padding: 6 }}
    >
      <svg className="zf-home-photo" viewBox="0 0 160 120" aria-hidden="true">
        <rect width="160" height="120" fill="var(--sage-100)" />
        <rect y="84" width="160" height="36" fill="var(--peach-100)" />
        <path d="M0 84h160" stroke="var(--cocoa-800)" strokeWidth="1.5" opacity=".4" />
        <image href={artUrl("cup")} x="34" y="22" width="92" height="77" />
        <path
          className="zf-ants a"
          d="M30 52c2-26 28-34 54-32 30 2 50 18 46 44-3 24-28 38-60 36-26-2-42-18-40-48Z"
        />
        <path
          className="zf-ants b"
          d="M30 52c2-26 28-34 54-32 30 2 50 18 46 44-3 24-28 38-60 36-26-2-42-18-40-48Z"
        />
      </svg>
    </Paper>
  );
}

/** A small journal page with a sticker and a strip of tape on it. */
function PageStep() {
  return (
    <Paper
      seed="demo-page"
      size="sm"
      tone="sheet-50"
      rotate={-1}
      tape={<Tape seed="demo-tape" x="50%" y="2px" angle={-6} color="tape-pink" />}
      faceStyle={{ padding: 8 }}
    >
      <div className="zf-home-page">
        <Sticker art="cup" size={64} seed="demo-page-cup" rotate={5} />
      </div>
    </Paper>
  );
}

/**
 * Photo -> cut -> page, shown at every width. Two steps (a first sticker) or three (the landing).
 */
export function HowDemo({ steps = 3 }: { steps?: 2 | 3 }) {
  const { t } = useTranslation();
  const names = t(steps === 3 ? "landing.steps" : "home.new.steps", {
    returnObjects: true,
  }) as string[];
  const label = (n: number) => `${n + 1} ${names[n]}`;
  return (
    <div
      className="zf-home-demo"
      role="group"
      aria-label={t("landing.demoLabel")}
      style={{ gap: 6 }}
    >
      <div className="zf-home-step" style={{ flex: "1 1 0" }}>
        <PhotoStep />
        <span>{label(0)}</span>
      </div>
      <Arrow />
      <div className="zf-home-step" style={{ flex: "1 1 0" }}>
        <Paper
          seed="demo-cut"
          size="sm"
          tone="scrap-warm"
          rotate={0.8}
          faceStyle={{ padding: 10 }}
        >
          <Sticker art="cup" size={96} seed="demo-cut-cup" rotate={0} />
        </Paper>
        <span>{label(1)}</span>
      </div>
      {steps === 3 && (
        <>
          <Arrow />
          <div className="zf-home-step" style={{ flex: "1 1 0" }}>
            <PageStep />
            <span>{label(2)}</span>
          </div>
        </>
      )}
    </div>
  );
}
