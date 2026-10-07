import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Paper } from "@/components/ui/Paper";
import { Sticker } from "@/components/ui/Sticker";
import { Tape } from "@/components/ui/Tape";
import type { ArtName } from "@/components/ui/art";
import { Skeleton } from "@/components/ui/Loader";
import { PaperPreview } from "@/features/journal/PageSetup";
import type { Journal } from "@/features/journal/journal.schema";
import type { Feature } from "./homeData";

/** The page you were last working on, with the one button to go back to it. */
export function ContinueCard({
  journal,
  when,
  onContinue,
  onNewSticker,
  onPreload,
}: {
  journal: Journal;
  /** "yesterday", "5 weeks ago". */
  when: string;
  onContinue: () => void;
  onNewSticker: () => void;
  onPreload?: () => void;
}) {
  const { t } = useTranslation();
  const w = 150;
  const h = Math.round((w * journal.page.height) / journal.page.width);
  return (
    <Paper
      seed="home-continue"
      size="lg"
      tone="scrap"
      rotate={0.5}
      tape={
        <>
          <Tape seed="hc1" x="12%" y="8px" angle={-7} color="tape-mustard" />
          <Tape seed="hc2" x="90%" y="6px" angle={7} color="tape-pink" />
        </>
      }
      faceStyle={{ padding: "28px 26px 26px" }}
    >
      <div className="zf-home-continue">
        <div style={{ width: "100%", maxWidth: 170 }}>
          {journal.thumbUrl ? (
            <img
              src={journal.thumbUrl}
              alt=""
              width={w}
              height={h}
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          ) : (
            <PaperPreview page={journal.page} width={w} />
          )}
        </div>
        <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
          <div className="zf-kicker">{t("home.continue.kicker")}</div>
          <h2 className="zf-h1" style={{ margin: 0, overflowWrap: "anywhere" }}>
            {journal.title}
          </h2>
          <p className="zf-muted" style={{ margin: 0 }}>
            {t("home.continue.edited", { when })}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <Button
              variant="primary"
              icon="pen"
              seed="home-continue-go"
              onPointerEnter={onPreload}
              onFocus={onPreload}
              onClick={onContinue}
            >
              {t("home.continue.cta")}
            </Button>
            <Button
              variant="secondary"
              icon="upload"
              seed="home-newsticker"
              onPointerEnter={onPreload}
              onClick={onNewSticker}
            >
              {t("home.continue.newSticker")}
            </Button>
          </div>
        </div>
      </div>
    </Paper>
  );
}

export interface WaitingRow {
  id: string;
  kind: "request" | "sticker" | "tape" | "journal" | "invite";
  name: string;
  title?: string;
  busy?: boolean;
  /** Accept, Join or Take a look. */
  onAct: () => void;
}

/** What is waiting for you, up to three rows, each with one button. */
export function WaitingCard({
  rows,
  total,
  onSeeAll,
}: {
  rows: WaitingRow[];
  total: number;
  onSeeAll: () => void;
}) {
  const { t } = useTranslation();
  const button = (r: WaitingRow) =>
    r.kind === "request" ? "accept" : r.kind === "invite" ? "join" : "look";
  return (
    <Paper
      seed="home-waiting"
      size="md"
      tone="scrap-cool"
      rotate={0.8}
      tape={<Tape seed="hw1" x="50%" y="4px" angle={4} color="tape-celery" />}
      faceStyle={{ padding: "26px 22px 22px" }}
    >
      <h2 className="zf-h2" style={{ margin: "0 0 12px" }} role="status">
        {t("home.waiting.count", { count: total })}
      </h2>
      <div className="zf-home-waiting">
        {rows.map((r) => (
          <div key={r.id} className="zf-home-waiting__row">
            <span style={{ flex: "1 1 160px", minWidth: 0, overflowWrap: "anywhere" }}>
              {t(`home.waiting.${r.kind}`, { name: r.name, title: r.title })}
            </span>
            <Button
              variant="secondary"
              size="sm"
              seed={"hwr" + r.id}
              loading={r.busy}
              onClick={r.onAct}
            >
              {t(`home.waiting.${button(r)}`)}
            </Button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <Button variant="quiet" size="sm" seed="hw-all" onClick={onSeeAll}>
          {t("home.waiting.seeAll")}
        </Button>
      </div>
    </Paper>
  );
}

/** Words in a hand-drawn oval, like an ink stamp. */
function Stamp({ children, done }: { children: string; done?: boolean }) {
  return (
    <span className={"zf-home-stamp" + (done ? " is-done" : "")}>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M6 22C4 8 30 3 52 4c28 1 46 6 43 18-3 13-26 16-48 15C22 36 7 33 6 22Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {children}
    </span>
  );
}

/** Four things to try, each a small scrap that goes to where it is done. */
export function PathCards({
  steps,
  onGo,
}: {
  steps: { done: boolean; start: boolean }[];
  onGo: (i: number) => void;
}) {
  const { t } = useTranslation();
  const keys = ["cut", "tape", "journal", "friend"] as const;
  const arts: ArtName[] = ["scissors", "roll", "notebook", "friends"];
  const tones = ["scrap", "scrap-warm", "scrap-cool", "scrap-pink"];
  return (
    <section>
      <div className="zf-home-row">
        <h2 className="zf-h1">{t("home.pathHead")}</h2>
      </div>
      <div className="zf-home-cards">
        {keys.map((k, i) => (
          <button key={k} type="button" className="zf-home-card" onClick={() => onGo(i)}>
            <Paper
              seed={"home-path-" + k}
              size="sm"
              tone={tones[i]}
              rotate={1.2}
              faceStyle={{ padding: "16px 16px 18px" }}
            >
              <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                <div style={{ minHeight: 26 }}>
                  {steps[i]?.done ? (
                    <Stamp done>{t("home.stamps.done")}</Stamp>
                  ) : steps[i]?.start ? (
                    <Stamp>{t("home.stamps.start")}</Stamp>
                  ) : null}
                </div>
                <Sticker art={arts[i]!} size={48} seed={"home-path-art" + i} rotate={0} />
                <h3 className="zf-h2" style={{ margin: 0 }}>
                  {t(`home.path.${k}.title`)}
                </h3>
                <span>{t(`home.path.${k}.body`)}</span>
              </div>
            </Paper>
          </button>
        ))}
      </div>
    </section>
  );
}

/** A small prompt to make something today. */
export function IdeaCard({ idea, onAnother }: { idea: string; onAnother: () => void }) {
  const { t } = useTranslation();
  return (
    <Paper
      seed="home-idea"
      size="md"
      tone="scrap-warm"
      rotate={-0.8}
      tape={<Tape seed="hi1" x="86%" y="4px" angle={8} color="tape-mustard" />}
      faceStyle={{ padding: "24px 22px 20px" }}
    >
      <div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Sticker art="sparkle" size={32} seed="home-idea-art" rotate={0} />
          <div className="zf-kicker">{t("home.idea.head")}</div>
        </div>
        <p style={{ margin: 0 }}>{idea}</p>
        <Button variant="quiet" size="sm" seed="home-idea-next" onClick={onAnother}>
          {t("home.idea.another")}
        </Button>
      </div>
    </Paper>
  );
}

/** One feature not used yet, with a button to it. */
export function NextStrip({ feature, onGo }: { feature: Feature; onGo: () => void }) {
  const { t } = useTranslation();
  return (
    <Paper
      seed="home-next"
      size="md"
      tone="scrap-pink"
      rotate={0.4}
      faceStyle={{ padding: "18px 22px" }}
    >
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", display: "grid", gap: 4 }}>
          <div className="zf-kicker">{t("home.next.kicker")}</div>
          <p style={{ margin: 0 }}>
            <b>{t(`home.next.${feature}.title`)}</b> {t(`home.next.${feature}.body`)}
          </p>
        </div>
        <Button variant="secondary" size="sm" seed="home-next-go" onClick={onGo}>
          {t(`home.next.${feature}.cta`)}
        </Button>
      </div>
    </Paper>
  );
}

/** A row of grey tiles while a list is on its way. */
export function StripSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="zf-home-strip" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} seed={"hsk" + i} width="100%" height={150} />
      ))}
    </div>
  );
}
