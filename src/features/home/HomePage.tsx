import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Paper } from "@/components/ui/Paper";
import { Sticker as DemoSticker } from "@/components/ui/Sticker";
import { Tape } from "@/components/ui/Tape";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/useAuth";
import { JournalTile } from "@/features/journal/JournalTile";
import { useRecentJournals } from "@/features/journal/useJournals";
import { useProfile } from "@/features/profile/useProfile";
import { friendName } from "@/features/social/social.schema";
import {
  useAcceptRequest,
  useInbox,
  useIncomingRequests,
} from "@/features/social/useSocial";
import {
  preloadStickerMaker,
  StickerMakerDialog,
} from "@/features/stickers/editor/LazyStickerMaker";
import { StickerDetailDialog } from "@/features/stickers/library/StickerDetailDialog";
import { StickerTile } from "@/features/stickers/library/StickerTile";
import { useRecentStickers } from "@/features/stickers/library/useStickers";
import { TapeTile } from "@/features/tape/TapeTile";
import { useRecentTapes } from "@/features/tape/useTapes";
import {
  useAcceptInvite,
  usePublicProfiles,
  useWorkspaces,
} from "@/features/together/useTogether";
import {
  ContinueCard,
  IdeaCard,
  NextStrip,
  PathCards,
  StripSkeleton,
  WaitingCard,
  type WaitingRow,
} from "./HomeCards";
import { HowDemo } from "./HowDemo";
import {
  ideaIndex,
  isAway,
  isNewAccount,
  newest,
  nextFeature,
  pathSteps,
  relativeParts,
  timeBand,
} from "./homeData";
import { useCount } from "./useHome";

const RECENT = 5;

/**
 * Home: your desk. Who you are today decides what is on it: a first sticker to cut, the page you
 * were working on, what a friend sent you, or a quiet welcome back. Dropping a photo anywhere on the
 * page opens the sticker maker with it.
 */
export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const { data: profile } = useProfile(uid);
  const name = profile?.nickname || currentUser?.displayName || "";
  // read once per visit: a page open at 04:59 does not need to change at 05:00
  const now = useMemo(() => new Date(), []);

  const stickers = useRecentStickers(12);
  const journals = useRecentJournals(3);
  const tapes = useRecentTapes(3);
  const friends = useCount("friends");
  const collections = useCount("collections");
  const requests = useIncomingRequests();
  const inbox = useInbox();
  const workspaces = useWorkspaces();
  const acceptRequest = useAcceptRequest();
  const acceptInvite = useAcceptInvite();

  const [makerOpen, setMakerOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [over, setOver] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [ideaOffset, setIdeaOffset] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  const start = (f: File | null) => {
    setFile(f);
    setMakerOpen(true);
  };

  // ---- what the data says
  const loaded = !stickers.isPending && !journals.isPending && !tapes.isPending;
  const stickerList = stickers.data ?? [];
  const journalList = journals.data ?? [];
  const tapeList = tapes.data ?? [];
  const counts = {
    stickers: stickerList.length,
    journals: journalList.length,
    tapes: tapeList.length,
  };
  const fresh = loaded && isNewAccount(counts);
  const last = newest([
    stickerList[0]?.createdAt,
    journalList[0]?.updatedAt,
    tapeList[0]?.createdAt,
  ]);
  const away = loaded && !fresh && isAway(last, now);
  const lastJournal = journalList[0];

  // ---- what is waiting
  const senders = [
    ...(requests.data ?? []).slice(0, 3).map((r) => r.from),
    ...(inbox.data ?? [])
      .filter((s) => !s.seen)
      .slice(0, 3)
      .map((s) => s.from),
    ...(workspaces.data?.invites ?? []).slice(0, 3).map((w) => w.ownerUid),
  ];
  const profiles = usePublicProfiles([...new Set(senders)]);
  const who = (id: string) => profiles.get(id)?.nickname ?? t("friends.someone");
  const entries = [
    ...(requests.data ?? []).map((r) => ({
      id: "r" + r.from,
      at: r.createdAt,
      row: {
        id: "r" + r.from,
        kind: "request" as const,
        name: friendName({ profile: r.profile }, t("friends.someone")),
        busy: busyId === "r" + r.from,
        onAct: () => {
          setBusyId("r" + r.from);
          acceptRequest.mutate(r.from, {
            onSuccess: () =>
              toast.push({
                kind: "success",
                title: t("home.waiting.friendNow", {
                  name: friendName({ profile: r.profile }, t("friends.someone")),
                }),
              }),
            onError: () =>
              toast.push({
                kind: "error",
                title: t("auth.errors.toastTitle"),
                body: t("home.waiting.failed"),
              }),
            onSettled: () => setBusyId(null),
          });
        },
      },
    })),
    ...(inbox.data ?? [])
      .filter((s) => !s.seen)
      .map((s) => ({
        id: "s" + s.id,
        at: s.createdAt,
        row: {
          id: "s" + s.id,
          kind: s.kind,
          name: who(s.from),
          onAct: () => navigate("/friends"),
        },
      })),
    ...(workspaces.data?.invites ?? []).map((w) => ({
      id: "w" + w.id,
      at: w.updatedAt,
      row: {
        id: "w" + w.id,
        kind: "invite" as const,
        name: who(w.ownerUid),
        title: w.title,
        busy: busyId === "w" + w.id,
        onAct: () => {
          setBusyId("w" + w.id);
          acceptInvite.mutate(w.id, {
            onSuccess: () =>
              toast.push({
                kind: "success",
                title: t("together.joined", { title: w.title }),
              }),
            onError: () =>
              toast.push({
                kind: "error",
                title: t("auth.errors.toastTitle"),
                body: t("home.waiting.failed"),
              }),
            onSettled: () => setBusyId(null),
          });
        },
      },
    })),
  ].sort((a, b) => +b.at - +a.at);
  const waiting: WaitingRow[] = entries.map((e) => e.row);

  // ---- words
  const band = timeBand(now);
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: "long" }).format(now);
  const when = (d: Date) => {
    const p = relativeParts(d, now);
    return new Intl.RelativeTimeFormat(i18n.language, { numeric: "auto" }).format(
      p.value,
      p.unit,
    );
  };
  const ideas = t("home.ideas", { returnObjects: true }) as string[];
  const idea = ideas[ideaIndex(now, ideaOffset, ideas.length)] ?? "";
  const date = (d: Date) =>
    t("book.cutOn", {
      date: new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
      }).format(d),
    });
  const used = {
    journal: journalList.length > 0,
    tape: tapeList.length > 0,
    friend: (friends.data ?? 0) > 0,
    collection: (collections.data ?? 0) > 0,
  };
  const next =
    loaded && friends.data !== undefined && collections.data !== undefined
      ? nextFeature(used)
      : null;
  const goNext = () =>
    navigate(
      next === "journal"
        ? "/journals?make=1"
        : next === "tape"
          ? "/tapes?make=1"
          : next === "friend"
            ? "/friends"
            : "/collections",
    );

  const heading = fresh
    ? t("home.new.title", { name })
    : away
      ? t("home.away.title", { name })
      : t(`home.greet.${band}`, { name });

  const recentCut = stickerList.slice(0, RECENT);
  const uploadButton = (
    <Button
      variant="primary"
      size="lg"
      icon="upload"
      seed="hu"
      onPointerEnter={preloadStickerMaker}
      onFocus={preloadStickerMaker}
      onClick={() => input.current?.click()}
    >
      {t("home.upload")}
    </Button>
  );
  const hero = (withDemo: boolean) => (
    <div className={withDemo ? "zf-home-hero" : undefined}>
      <Paper
        seed="hero"
        size="lg"
        tone={over ? "scrap-cool" : "scrap"}
        rotate={0.6}
        tape={
          <>
            <Tape seed="h1" x="10%" y="8px" angle={-8} color="tape-mustard" />
            <Tape seed="h2" x="92%" y="6px" angle={8} color="tape-celery" />
          </>
        }
        faceStyle={{ padding: "30px 28px 28px" }}
      >
        <div className="zf-kicker">
          {over ? t("home.drop") : fresh ? t("home.new.kicker") : weekday}
        </div>
        <h1 className="zf-display" style={{ margin: "8px 0 10px" }}>
          {heading}
        </h1>
        {fresh && (
          <p style={{ margin: "0 0 22px", maxWidth: 460 }}>{t("home.new.body")}</p>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {uploadButton}
          <Button variant="quiet" seed="hh" onClick={() => setHowOpen(true)}>
            {t("home.how")}
          </Button>
        </div>
        {fresh && (
          <p className="zf-muted zf-hide-m" style={{ margin: "14px 0 0" }}>
            {t("home.new.drop")}
          </p>
        )}
      </Paper>
      {withDemo && <HowDemo steps={2} />}
    </div>
  );

  const waitingCard =
    waiting.length > 0 ? (
      <WaitingCard
        rows={waiting.slice(0, 3)}
        total={waiting.length}
        onSeeAll={() => navigate("/friends")}
      />
    ) : null;
  const ideaCard = <IdeaCard idea={idea} onAnother={() => setIdeaOffset((n) => n + 1)} />;

  const recentSection = (
    <section>
      <div className="zf-home-row">
        <h2 className="zf-h1">{t("home.recent")}</h2>
        <Button
          variant="secondary"
          size="sm"
          icon="book"
          seed="sa"
          onClick={() => navigate("/stickers")}
        >
          {t("home.seeAll")}
        </Button>
      </div>
      {stickers.isPending ? (
        <StripSkeleton />
      ) : recentCut.length === 0 ? (
        <EmptyState
          seed="home-empty"
          title={t("home.emptyTitle")}
          art={<DemoSticker art="cherry" size={60} />}
          width={420}
        >
          {t("home.emptyBody")}
        </EmptyState>
      ) : (
        <div className="zf-home-strip">
          {recentCut.map((s, i) => (
            <div key={s.id} className={i > 3 ? "zf-hide-m" : ""}>
              <StickerTile
                sticker={s}
                size={120}
                date={date(s.createdAt)}
                onOpen={() => setPreviewId(s.id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const latestSection =
    journalList.length + tapeList.length > 0 ? (
      <section>
        <div className="zf-home-row">
          <h2 className="zf-h1">{t("home.latest.head")}</h2>
          {journalList.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon="journal"
              seed="sj"
              onClick={() => navigate("/journals")}
            >
              {t("home.latest.seeJournals")}
            </Button>
          )}
        </div>
        <div className="zf-home-strip">
          {journalList.slice(0, 2).map((j, i) => (
            <JournalTile key={j.id} journal={j} index={i} />
          ))}
          {tapeList.slice(0, 2).map((tp, i) => (
            <TapeTile
              key={tp.id}
              tape={tp}
              index={i}
              pickMode
              onUse={() => navigate("/tapes")}
            />
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div
      className="zf-page zf-home"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        depth.current++;
        setOver(true);
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) start(dropped);
      }}
    >
      {!loaded ? (
        <>
          <h1 className="zf-display" style={{ margin: 0 }}>
            {t(`home.greet.${band}`, { name })}
          </h1>
          <StripSkeleton />
        </>
      ) : fresh ? (
        <>
          {hero(true)}
          {waitingCard}
          <PathCards
            steps={pathSteps({ ...counts, friends: friends.data ?? 0 })}
            onGo={(i) =>
              i === 0
                ? input.current?.click()
                : navigate(["", "/tapes?make=1", "/journals?make=1", "/friends"][i]!)
            }
          />
          <div className="zf-home-two">
            {recentSection}
            {ideaCard}
          </div>
        </>
      ) : (
        <>
          {lastJournal ? (
            <div className="zf-home-two">
              <div style={{ display: "grid", gap: 14 }}>
                {over && <div className="zf-kicker">{t("home.drop")}</div>}
                <div className="zf-kicker">{weekday}</div>
                <h1 className="zf-display" style={{ margin: 0 }}>
                  {heading}
                </h1>
                {away && (
                  <p style={{ margin: 0 }}>
                    {t("home.away.body", {
                      title: lastJournal.title,
                      when: when(lastJournal.updatedAt),
                    })}
                  </p>
                )}
                <ContinueCard
                  journal={lastJournal}
                  when={when(lastJournal.updatedAt)}
                  onPreload={preloadStickerMaker}
                  onContinue={() => navigate(`/journals/${lastJournal.id}`)}
                  onNewSticker={() => input.current?.click()}
                />
              </div>
              {waitingCard ?? ideaCard}
            </div>
          ) : (
            <div className="zf-home-two">
              {hero(false)}
              {waitingCard ?? ideaCard}
            </div>
          )}
          {recentSection}
          {latestSection}
          {next && <NextStrip feature={next} onGo={goNext} />}
          {(waitingCard || away) && (
            <div className="zf-home-two">
              {ideaCard}
              {away && (
                <Paper
                  seed="home-refresh"
                  size="md"
                  tone="sheet-50"
                  rotate={0.5}
                  faceStyle={{ padding: "20px 22px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ flex: "1 1 180px" }}>{t("home.away.refresher")}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      seed="home-refresh-go"
                      onClick={() => setHowOpen(true)}
                    >
                      {t("home.how")}
                    </Button>
                  </div>
                </Paper>
              )}
            </div>
          )}
        </>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        aria-label={t("home.upload")}
        onChange={(e) => {
          const picked = e.target.files?.[0];
          e.target.value = "";
          if (picked) start(picked);
        }}
      />
      <StickerDetailDialog
        sticker={stickerList.find((s) => s.id === previewId) ?? null}
        date={(() => {
          const s = stickerList.find((x) => x.id === previewId);
          return s
            ? new Intl.DateTimeFormat(i18n.language, {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(s.createdAt)
            : "";
        })()}
        onClose={() => setPreviewId(null)}
        onOpenLibrary={() => navigate("/stickers")}
      />
      <StickerMakerDialog
        open={makerOpen}
        onOpenChange={(o) => {
          setMakerOpen(o);
          if (!o) setFile(null);
        }}
        initialFile={file}
      />
      <Dialog
        open={howOpen}
        onOpenChange={setHowOpen}
        width={460}
        seed="how"
        kicker={t("home.howKicker")}
        title={t("home.how")}
        actions={
          <Button variant="primary" seed="hg" onClick={() => setHowOpen(false)}>
            {t("home.gotIt")}
          </Button>
        }
      >
        <ol style={{ margin: "0 0 22px", paddingLeft: 22, display: "grid", gap: 10 }}>
          {(t("home.howSteps", { returnObjects: true }) as string[]).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Dialog>
    </div>
  );
}
