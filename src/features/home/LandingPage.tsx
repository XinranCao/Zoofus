import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Paper } from "@/components/ui/Paper";
import { Sticker } from "@/components/ui/Sticker";
import { Tape } from "@/components/ui/Tape";
import type { ArtName } from "@/components/ui/art";
import { HowDemo } from "./HowDemo";

const FEATURES: {
  key: "stickers" | "tape" | "journals" | "together";
  art: ArtName;
  tone: string;
}[] = [
  { key: "stickers", art: "pear", tone: "scrap" },
  { key: "tape", art: "roll", tone: "scrap-warm" },
  { key: "journals", art: "notebook", tone: "scrap-cool" },
  { key: "together", art: "friends", tone: "scrap-pink" },
];

/**
 * What a visitor who is not signed in sees at `/`: what Zoofus is (a photo becomes a sticker, a
 * sticker goes on a page), what it makes, that it is private and free, and one way in.
 */
export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const signUp = () => navigate("/signup");
  return (
    <div className="zf-page zf-home">
      <section className="zf-home-hero">
        <Paper
          seed="land-hero"
          size="lg"
          tone="scrap"
          rotate={0.6}
          tape={
            <>
              <Tape seed="lh1" x="10%" y="8px" angle={-8} color="tape-mustard" />
              <Tape seed="lh2" x="90%" y="6px" angle={8} color="tape-celery" />
            </>
          }
          faceStyle={{ padding: "30px 28px 28px" }}
        >
          <div className="zf-kicker">{t("landing.kicker")}</div>
          <h1 className="zf-display" style={{ margin: "8px 0 12px" }}>
            {t("landing.title")}
          </h1>
          <p style={{ margin: "0 0 22px", maxWidth: 460 }}>{t("landing.body")}</p>
          <div
            style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}
          >
            <Button
              variant="primary"
              size="lg"
              icon="upload"
              seed="land-cta"
              onClick={signUp}
            >
              {t("landing.cta")}
            </Button>
            <Button variant="quiet" seed="land-login" onClick={() => navigate("/login")}>
              {t("landing.login")}
            </Button>
          </div>
          <p className="zf-muted" style={{ margin: "14px 0 0" }}>
            {t("landing.fine")}
          </p>
        </Paper>
        <HowDemo steps={3} />
      </section>

      <section>
        <div className="zf-home-row">
          <h2 className="zf-h1">{t("landing.head")}</h2>
        </div>
        <div className="zf-home-cards">
          {FEATURES.map((f, i) => (
            <Paper
              key={f.key}
              seed={"land-" + f.key}
              size="sm"
              tone={f.tone}
              rotate={1.2}
              faceStyle={{ padding: "18px 18px 20px" }}
            >
              <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
                <Sticker art={f.art} size={56} seed={"land-art" + i} rotate={0} />
                <h3 className="zf-h2" style={{ margin: 0 }}>
                  {t(`landing.${f.key}.title`)}
                </h3>
                <p style={{ margin: 0 }}>{t(`landing.${f.key}.body`)}</p>
              </div>
            </Paper>
          ))}
        </div>
      </section>

      <Paper
        seed="land-share"
        size="md"
        tone="sheet-50"
        rotate={0.4}
        faceStyle={{ padding: "20px 24px" }}
      >
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <Sticker art="envelope" size={64} seed="land-env" rotate={0} />
          <p style={{ margin: 0, flex: "1 1 260px" }}>{t("landing.share")}</p>
          <div
            className="zf-hide-m"
            style={{ display: "flex", gap: 14, alignItems: "center" }}
          >
            <Sticker art="pear" size={52} seed="land-s1" rotate={0} />
            <Sticker art="star" size={48} seed="land-s2" rotate={0} />
            <Sticker art="fish" size={56} seed="land-s3" rotate={0} />
          </div>
        </div>
      </Paper>

      <p
        style={{
          margin: 0,
          display: "flex",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <Icon name="check" />
        <span>{t("landing.privacy")}</span>
      </p>

      <Paper
        seed="land-close"
        size="md"
        tone="scrap-warm"
        rotate={-0.5}
        tape={<Tape seed="lc1" x="50%" y="4px" angle={-4} color="tape-pink" />}
        faceStyle={{ padding: "24px 26px", textAlign: "center" }}
      >
        <h2 className="zf-h1" style={{ margin: "0 0 14px" }}>
          {t("landing.closing")}
        </h2>
        <Button
          variant="primary"
          size="lg"
          icon="upload"
          seed="land-cta2"
          onClick={signUp}
        >
          {t("landing.cta")}
        </Button>
      </Paper>
    </div>
  );
}
