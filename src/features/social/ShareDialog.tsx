import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { ShareSource } from "./share.api";
import { MAX_NOTE, friendName } from "./social.schema";
import { useFriends, useShare } from "./useSocial";

/** Send the picked things to one or more friends. They land in the friend's "Shared with you". */
export function ShareDialog({
  open,
  sources,
  onClose,
  onDone,
}: {
  open: boolean;
  sources: ShareSource[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: friends = [], isPending } = useFriends();
  const share = useShare();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  /** Cancel while sending: nothing further is started; what is already under way finishes quietly. */
  const cancelled = useRef(false);

  const toggle = (uid: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const cancel = () => {
    cancelled.current = true;
    setBusy(false);
    onClose();
  };

  const send = async () => {
    cancelled.current = false;
    setBusy(true);
    let failed = 0;
    let code = "";
    for (const friend of chosen)
      for (const source of sources) {
        if (cancelled.current) break;
        try {
          await share.mutateAsync({ friend, source, note });
        } catch (err) {
          console.error("Sharing failed", err);
          failed++;
          code = (err as { code?: string }).code ?? (err as Error).name ?? "error";
        }
      }
    setBusy(false);
    if (cancelled.current) return;
    if (failed)
      toast.push({
        kind: "error",
        title: t("auth.errors.toastTitle"),
        body: `${t("share.failed", { count: failed })} (${code})`,
      });
    else {
      toast.push({ kind: "success", title: t("share.sent", { count: sources.length }) });
      setChosen(new Set());
      setNote("");
      onClose();
      onDone?.();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && cancel()}
      width={520}
      sheet
      seed="share"
      tapes={1}
      title={t("share.title", { count: sources.length })}
      actions={
        <>
          <Button variant="quiet" seed="shc" onClick={cancel}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            icon="send"
            seed="shg"
            disabled={chosen.size === 0 || sources.length === 0}
            loading={busy}
            onClick={() => void send()}
          >
            {busy ? t("share.sending") : t("share.send")}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 16, margin: "10px 0 6px" }}>
        {sources.length > 0 && (
          <ul className="zf-faces" aria-label={t("share.sending")}>
            {sources.slice(0, 8).map((s, i) => {
              const src =
                s.kind === "sticker"
                  ? s.sticker.imageUrl
                  : s.kind === "journal"
                    ? s.journal.thumbUrl
                    : undefined;
              const name =
                s.kind === "sticker"
                  ? s.sticker.name
                  : s.kind === "journal"
                    ? s.journal.title
                    : s.tape.name;
              return (
                <li key={i} title={name}>
                  {src ? (
                    <img src={src} alt={name} style={{ height: 54, width: "auto" }} />
                  ) : (
                    <span className="zf-muted">
                      <Icon name={s.kind === "tape" ? "tape" : "journal"} /> {name}
                    </span>
                  )}
                </li>
              );
            })}
            {sources.length > 8 && <li className="zf-muted">+{sources.length - 8}</li>}
          </ul>
        )}
        {!isPending && friends.length === 0 ? (
          <p style={{ margin: 0 }}>
            {t("share.noFriends")} <Link to="/friends">{t("share.addFriends")}</Link>
          </p>
        ) : (
          <fieldset className="zf-fieldset">
            <legend className="zf-label">{t("share.to")}</legend>
            <ul className="zf-pick-list">
              {friends.map((f) => {
                const on = chosen.has(f.uid);
                const name = friendName(f, t("friends.someone"));
                return (
                  <li key={f.uid}>
                    <button
                      type="button"
                      className={cn("zf-menu__item", on && "is-active")}
                      aria-pressed={on}
                      onClick={() => toggle(f.uid)}
                    >
                      <Avatar
                        name={name}
                        src={f.profile?.avatarUrl}
                        kind={f.profile?.avatarKind}
                        size={34}
                        seed={"sh" + f.uid}
                        asStatic
                      />
                      <span style={{ flex: 1 }}>{name}</span>
                      {on && <Icon name="check" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        )}
        <TextField
          label={t("share.note")}
          seed="shnote"
          value={note}
          maxLength={MAX_NOTE}
          placeholder={t("share.notePlaceholder")}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Dialog>
  );
}
