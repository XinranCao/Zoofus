import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Collage } from "@/components/ui/Collage";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Loader";
import { Paper } from "@/components/ui/Paper";
import { Sticker as DemoSticker } from "@/components/ui/Sticker";
import { Tape } from "@/components/ui/Tape";
import { StickerMakerDialog } from "@/features/stickers/editor/StickerMakerDialog";
import { StickerTile } from "@/features/stickers/library/StickerTile";
import { useStickers } from "@/features/stickers/library/useStickers";

/**
 * Home: the hero entry into the sticker maker plus the recently cut row. Dropping a photo anywhere
 * on the page opens the maker with it.
 */
export default function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isPending } = useStickers();
  const [makerOpen, setMakerOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  const start = (f: File | null) => {
    setFile(f);
    setMakerOpen(true);
  };
  const recent = (data ?? []).slice(0, 5);
  const date = (d: Date) =>
    t("book.cutOn", {
      date: new Intl.DateTimeFormat(i18n.language, {
        day: "numeric",
        month: "short",
      }).format(d),
    });

  return (
    <div
      className="zf-page"
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
      <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
        <Paper
          seed="hero"
          size="lg"
          tone={over ? "scrap-cool" : "scrap"}
          rotate={0.6}
          w={640}
          h={300}
          style={{ flex: "1 1 320px", maxWidth: 660 }}
          tape={
            <>
              <Tape seed="h1" x="10%" y="8px" angle={-8} color="tape-mustard" />
              <Tape seed="h2" x="92%" y="6px" angle={8} color="tape-celery" />
            </>
          }
          faceStyle={{ padding: "30px 28px 28px" }}
        >
          <div className="zf-kicker">{over ? t("home.drop") : t("home.kicker")}</div>
          <h1 className="zf-display" style={{ margin: "8px 0 10px" }}>
            {t("home.title")}
          </h1>
          <p style={{ margin: "0 0 22px", maxWidth: 440 }}>{t("home.body")}</p>
          <div
            style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}
          >
            <Button
              variant="primary"
              size="lg"
              icon="upload"
              seed="hu"
              onClick={() => input.current?.click()}
            >
              {t("home.upload")}
            </Button>
            <Button variant="quiet" seed="hh" onClick={() => setHowOpen(true)}>
              {t("home.how")}
            </Button>
          </div>
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
        </Paper>
        <div className="zf-hide-m" style={{ flex: "0 0 360px" }}>
          <Collage arts={["pear", "cup", "cherry", "leaf"]} size={120} gap={24} />
        </div>
      </div>

      <div style={{ height: 44 }} />
      <div
        style={{
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="zf-kicker">{t("home.recentKicker")}</div>
          <h2 className="zf-h1" style={{ marginTop: 4 }}>
            {t("home.recent")}
          </h2>
        </div>
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
      {isPending ? (
        <div className="zf-grid-book" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={i > 3 ? "zf-hide-m" : ""}>
              <Skeleton seed={"hsk" + i} width="100%" height={120} />
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState
          seed="home-empty"
          title={t("home.emptyTitle")}
          art={<DemoSticker art="cherry" size={60} />}
          width={420}
        >
          {t("home.emptyBody")}
        </EmptyState>
      ) : (
        <div className="zf-grid-book">
          {recent.map((s, i) => (
            <div key={s.id} className={i > 3 ? "zf-hide-m" : ""}>
              <StickerTile
                sticker={s}
                size={92}
                date={date(s.createdAt)}
                onOpen={() => navigate("/stickers")}
              />
            </div>
          ))}
        </div>
      )}

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
