import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import {
  DEFAULT_PAGE,
  MAX_JOURNAL_TITLE,
  type PageSpec,
} from "@/features/journal/journal.schema";
import { PagePreviewPane } from "@/features/journal/PagePreviewPane";
import { PageSetup } from "@/features/journal/PageSetup";
import { friendName } from "@/features/social/social.schema";
import { useFriends } from "@/features/social/useSocial";
import { cn } from "@/lib/cn";
import { useCreateWorkspace } from "./useTogether";

/** Start a shared journal: a title, the paper, and which friends to ask in. */
export function NewWorkspaceDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing: number;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: friends = [] } = useFriends();
  const create = useCreateWorkspace();
  const [title, setTitle] = useState("");
  const [page, setPage] = useState<PageSpec>(DEFAULT_PAGE);
  const [invite, setInvite] = useState<Set<string>>(new Set());

  const toggle = (uid: string) =>
    setInvite((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else if (next.size < 7) next.add(uid);
      return next;
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={860}
      sheet
      seed="new-workspace"
      title={t("together.newTitle")}
      actions={
        <>
          <Button variant="quiet" seed="nwc" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            icon="check"
            seed="nwg"
            loading={create.isPending}
            onClick={() =>
              create.mutate(
                {
                  title: title.trim() || t("together.defaultTitle", { n: existing + 1 }),
                  page,
                  invite: [...invite],
                },
                {
                  onSuccess: (id) => {
                    onClose();
                    setTitle("");
                    setInvite(new Set());
                    navigate(`/together/${id}`);
                  },
                  onError: () =>
                    toast.push({
                      kind: "error",
                      title: t("auth.errors.toastTitle"),
                      body: t("together.createFailed"),
                    }),
                },
              )
            }
          >
            {t("together.start")}
          </Button>
        </>
      }
    >
      <div className="zf-newjournal">
        <div style={{ display: "grid", gap: 22, minWidth: 0 }}>
          <TextField
            label={t("journal.title")}
            seed="nwt"
            value={title}
            maxLength={MAX_JOURNAL_TITLE}
            placeholder={t("together.defaultTitle", { n: existing + 1 })}
            onChange={(e) => setTitle(e.target.value)}
          />
          <fieldset className="zf-fieldset">
            <legend className="zf-label">{t("together.invite")}</legend>
            {friends.length === 0 ? (
              <p className="zf-muted" style={{ margin: 0 }}>
                {t("together.noFriends")}
              </p>
            ) : (
              <ul className="zf-pick-list">
                {friends.map((f) => {
                  const on = invite.has(f.uid);
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
                          size={30}
                          seed={"nw" + f.uid}
                          asStatic
                        />
                        <span style={{ flex: 1 }}>{name}</span>
                        {on && <Icon name="check" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
          <PageSetup value={page} onChange={setPage} />
        </div>
        <PagePreviewPane page={page} />
      </div>
    </Dialog>
  );
}
