import type { ReactNode } from "react";
import { Paper } from "./Paper";
import { Tape } from "./Tape";

/** A taped note with one small sticker, a title, one line and one action. */
export function EmptyState({
  title,
  kicker,
  art,
  action,
  tone = "scrap-warm",
  width = 440,
  seed = "empty",
  children,
}: {
  title: ReactNode;
  kicker?: ReactNode;
  art?: ReactNode;
  action?: ReactNode;
  tone?: string;
  width?: number;
  seed?: string;
  children?: ReactNode;
}) {
  return (
    <Paper
      seed={seed}
      size="lg"
      tone={tone}
      rotate={1.2}
      w={420}
      h={300}
      style={{ maxWidth: width, margin: "0 auto" }}
      tape={<Tape seed={"e" + seed} x="50%" y="0" color="tape-celery" />}
      faceStyle={{ padding: "36px 28px 28px", textAlign: "center" }}
    >
      {art && (
        <div style={{ display: "grid", placeItems: "center", marginBottom: 14 }}>
          {art}
        </div>
      )}
      {kicker && <div className="zf-kicker">{kicker}</div>}
      <h2 className="zf-h2" style={{ margin: "6px 0 8px" }}>
        {title}
      </h2>
      {children && <p style={{ margin: "0 0 20px", fontSize: 15 }}>{children}</p>}
      {action}
    </Paper>
  );
}
