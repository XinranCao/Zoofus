import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Paper } from "./Paper";

/** True once `ms` have passed since the component mounted (a quick load never flashes a state). */
function useAfter(ms: number): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return late;
}

/**
 * "Loading your journals…" as a polite status, shown only if the data is still not there after
 * 300 ms. Mount it while a list is loading, next to its skeleton.
 */
export function LoadingNote({ text }: { text: string }) {
  const { t } = useTranslation();
  const late = useAfter(300);
  const slow = useAfter(3000);
  return (
    <p className="zf-muted" role="status" style={{ margin: "0 0 12px" }}>
      {late ? text : ""}
      {slow ? ` ${t("common.stillWorking")}` : ""}
    </p>
  );
}

/** Inline typing dots after a verb: "Saving…". The dots stay visible under reduced motion. */
export function Typing({ label }: { label?: string }) {
  return (
    <span className="zf-typing" role="status">
      {label}
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}

/** A spinning tape reel plus a verb, for areas. */
export function Reel({ label }: { label?: string }) {
  return (
    <span
      role="status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        color: "var(--ink)",
      }}
    >
      <svg width={34} height={34} viewBox="0 0 34 34" aria-hidden="true">
        <g className="zf-reel">
          <circle cx={17} cy={17} r={14} fill="var(--mustard-300)" opacity={0.85} />
          <circle cx={17} cy={17} r={5.5} fill="var(--ground)" />
          <path
            d="M17 3.5c3 .2 6 1.6 8 4"
            stroke="var(--cocoa-800)"
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            opacity={0.6}
          />
        </g>
      </svg>
      {label && (
        <span className="zf-typing">
          {label}
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      )}
    </span>
  );
}

/** A sage scrap at tile size, breathing between 100% and 55% opacity. */
export function Skeleton({
  seed,
  width = 140,
  height = 140,
}: {
  seed?: string;
  width?: number | string;
  height?: number;
}) {
  return (
    <div aria-hidden="true">
      <Paper
        seed={seed ?? "skeleton"}
        size="md"
        rotate={1.5}
        className="zf-skeleton"
        style={{ width }}
        faceStyle={{ height }}
      />
    </div>
  );
}
