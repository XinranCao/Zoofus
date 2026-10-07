import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Paper } from "@/components/ui/Paper";
import { Sticker as Art } from "@/components/ui/Sticker";
import { Tape } from "@/components/ui/Tape";
import { useToast } from "@/components/ui/Toast";
import { JournalCanvas, type StickerResolver } from "@/features/journal/JournalCanvas";
import { PaperPreview } from "@/features/journal/PageSetup";
import { useAuth } from "@/features/auth/useAuth";
import { useJournalCount } from "@/features/journal/useJournals";
import { ensureFontsFor } from "@/lib/cjkFonts";
import { loadShareItems } from "./share.api";
import {
  friendName,
  journalPayloadSchema,
  type JournalPayload,
  stickerPayloadSchema,
  tapePayloadSchema,
  type Share,
} from "./social.schema";
import {
  useDismissShare,
  useFriends,
  useInbox,
  useMarkSeen,
  useSaveShared,
} from "./useSocial";

/** What friends have shared with you: look, keep it as your own, or let it go. */
export function SharedWithYou() {
  const { t } = useTranslation();
  const inboxQuery = useInbox();
  const { data: all = [], isPending } = inboxQuery;
  // what I have kept is mine now: it leaves this list
  const inbox = all.filter((s) => !s.saved);
  const mark = useMarkSeen();

  // looking at them is what marks them seen
  useEffect(() => {
    for (const s of inbox) if (!s.seen) mark.mutate(s.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when the list arrives
  }, [inbox.length]);

  if (isPending) return <div aria-busy="true" />;
  if (inbox.length === 0)
    return (
      <EmptyState
        seed="noshare"
        title={t("shared.emptyTitle")}
        art={<Art art="envelope" size={74} />}
      >
        {t("shared.emptyBody")}
      </EmptyState>
    );
  return (
    <ul className="zf-grid-journal" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {inbox.map((s, i) => (
        <li key={s.id}>
          <SharedCard share={s} index={i} />
        </li>
      ))}
      {inboxQuery.hasNextPage && (
        <li style={{ gridColumn: "1 / -1", display: "grid", placeItems: "center" }}>
          <Button
            variant="secondary"
            seed="sharemore"
            loading={inboxQuery.isFetchingNextPage}
            onClick={() => void inboxQuery.fetchNextPage()}
          >
            {t("common.showMore")}
          </Button>
        </li>
      )}
    </ul>
  );
}

function Preview({ share, alt }: { share: Share; alt: string }) {
  if (share.kind === "sticker") {
    const p = stickerPayloadSchema.safeParse(share.payload);
    return p.success ? (
      <img
        src={p.data.imageUrl}
        alt={alt}
        width={p.data.width}
        height={p.data.height}
        loading="lazy"
        style={{
          maxWidth: "100%",
          maxHeight: 130,
          width: "auto",
          height: "auto",
          objectFit: "contain",
        }}
      />
    ) : null;
  }
  if (share.kind === "tape") {
    const p = tapePayloadSchema.safeParse(share.payload);
    return p.success ? (
      <span style={{ position: "relative", display: "block", width: "100%", height: 50 }}>
        <Tape
          pattern={p.data.pattern}
          length={110}
          thickness={p.data.thickness}
          opacity={p.data.opacity}
          ends={p.data.ends}
          angle={-6}
          x="50%"
          y="50%"
          seed={"sh" + share.id}
        />
      </span>
    ) : null;
  }
  const p = journalPayloadSchema.safeParse(share.payload);
  if (!p.success) return null;
  return p.data.thumbUrl ? (
    <img
      src={p.data.thumbUrl}
      alt={alt}
      loading="lazy"
      style={{ maxWidth: "100%", maxHeight: 190, width: "auto", height: "auto" }}
    />
  ) : (
    <PayloadPagePreview share={share} payload={p.data} />
  );
}

/**
 * A shared journal that came without a page picture (its owner had not saved since the last
 * edit): draw the page itself from what was sent, read-only, so the inbox never shows bare paper.
 */
function PayloadPagePreview({
  share,
  payload,
}: {
  share: Share;
  payload: JournalPayload;
}) {
  const { currentUser } = useAuth();
  // newer shares keep the items next to the share: read them only now, for the page to be drawn
  const loaded = useQuery({
    queryKey: ["shareItems", currentUser?.uid ?? "", share.id],
    queryFn: () => loadShareItems(currentUser!.uid, share, payload),
    enabled: Boolean(currentUser) && !payload.items && (payload.itemCount ?? 1) > 0,
    staleTime: 5 * 60_000,
  });
  const items = payload.items ?? loaded.data ?? [];
  const assets = payload.assets;
  const resolve: StickerResolver = useMemo(
    () => (ref: string) => {
      const a = ref.startsWith("a:") ? assets?.[ref.slice(2)] : undefined;
      return a ? { url: a.url, w: a.w, h: a.h, name: a.name } : null;
    },
    [assets],
  );
  if (items.length === 0) return <PaperPreview page={payload.page} width={120} />;
  return (
    <span className="zf-payload-page" style={{ display: "block" }}>
      <JournalCanvas page={payload.page} items={items} resolve={resolve} width={150} />
    </span>
  );
}

function SharedCard({ share, index }: { share: Share; index: number }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data: friends = [] } = useFriends();
  // only the number is needed (the limit on journals), so nothing is listed
  const { data: journalCount = 0 } = useJournalCount(share.kind === "journal");
  const save = useSaveShared();
  const dismiss = useDismissShare();
  const from = friends.find((f) => f.uid === share.from);
  const who = from ? friendName(from, t("friends.someone")) : t("friends.someone");
  ensureFontsFor(share.name + who + (share.note ?? ""));
  return (
    <Paper
      seed={"sc" + share.id}
      size="md"
      tone={index % 2 ? "scrap" : "scrap-warm"}
      rotate={0.9}
      tape={
        index % 3 === 0 ? (
          <Tape seed={"sct" + share.id} x="50%" y="2px" length={54} thickness={16} />
        ) : undefined
      }
      faceStyle={{
        padding: "20px 18px",
        display: "grid",
        gap: 10,
        justifyItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{ minHeight: 100, display: "grid", placeItems: "center", width: "100%" }}
      >
        <Preview share={share} alt={t(`shared.from.${share.kind}`, { name: who })} />
      </div>
      <div className="zf-h2" style={{ fontSize: 17 }}>
        {share.name}
      </div>
      <div className="zf-muted" style={{ fontSize: 13 }}>
        {t(`shared.from.${share.kind}`, { name: who })} ·{" "}
        {new Intl.DateTimeFormat(i18n.language, {
          day: "numeric",
          month: "short",
        }).format(share.createdAt)}
      </div>
      {share.note && <p style={{ margin: 0 }}>“{share.note}”</p>}
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}
      >
        <Button
          variant="primary"
          size="sm"
          icon="download"
          seed={"ss" + share.id}
          loading={save.isPending && save.variables?.share.id === share.id}
          onClick={() =>
            // awaited here (not a mutate callback): this card leaves the list once the share is kept,
            // and the note must still appear
            void save
              .mutateAsync({ share, journals: journalCount })
              .then(() =>
                toast.push({ kind: "success", title: t(`shared.saved.${share.kind}`) }),
              )
              .catch((err) => {
                console.error("Saving a shared item failed", err);
                toast.push({
                  kind: "error",
                  title: t("auth.errors.toastTitle"),
                  body: `${t("shared.saveFailed")} (${(err as { code?: string }).code ?? (err as Error).name ?? "error"})`,
                });
              })
          }
        >
          {t(`shared.save.${share.kind}`)}
        </Button>
        <Button
          variant="quiet"
          size="sm"
          icon="x"
          seed={"sd" + share.id}
          loading={dismiss.isPending && dismiss.variables?.id === share.id}
          onClick={() => dismiss.mutate({ id: share.id, from: share.from })}
        >
          {t("shared.dismiss")}
        </Button>
      </div>
    </Paper>
  );
}
