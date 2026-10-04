import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Paper } from "@/components/ui/Paper";
import { useToast } from "@/components/ui/Toast";
import { friendName } from "@/features/social/social.schema";
import { useFriends } from "@/features/social/useSocial";
import { cn } from "@/lib/cn";
import { useInviteFriends, usePublicProfiles } from "./useTogether";
import type { Presence, Workspace } from "./workspace.schema";

const ONLINE_MS = 70_000;

/** Who is on the shared page (and who is here right now), and a way to ask more friends in. */
export function MembersPanel({
  workspace,
  presence,
  me,
}: {
  workspace: Workspace;
  presence: Presence[];
  me: string;
}) {
  const { t } = useTranslation();
  const profiles = usePublicProfiles([...workspace.members, ...workspace.invited]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const online = new Set(
    presence.filter((p) => now - p.ts.getTime() < ONLINE_MS).map((p) => p.uid),
  );
  const full = workspace.members.length + workspace.invited.length >= 8;
  return (
    <Paper
      seed="members"
      size="sm"
      tone="scrap-cool"
      rotate={-0.4}
      faceStyle={{ padding: "14px 14px 16px" }}
    >
      <h2 className="zf-h2" style={{ fontSize: 15, marginBottom: 8 }}>
        {t("together.here")}
      </h2>
      <ul className="zf-people" style={{ gap: 6 }}>
        {workspace.members.map((uid) => {
          const p = profiles.get(uid);
          const isOnline = online.has(uid) || uid === me;
          return (
            <li key={uid} className="zf-person" style={{ gap: 8, flexWrap: "nowrap" }}>
              <Avatar
                name={p?.nickname ?? "?"}
                src={p?.avatarUrl}
                kind={p?.avatarKind}
                size={30}
                seed={"mp" + uid}
                asStatic
              />
              <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
                {p?.nickname ?? t("friends.someone")}
                {uid === me ? ` (${t("together.you")})` : ""}
              </span>
              <span
                className={cn("zf-dot", isOnline && "is-on")}
                role="img"
                aria-label={isOnline ? t("together.online") : t("together.away")}
              />
            </li>
          );
        })}
        {workspace.invited.map((uid) => {
          const p = profiles.get(uid);
          return (
            <li
              key={uid}
              className="zf-person zf-muted"
              style={{ gap: 8, flexWrap: "nowrap" }}
            >
              <Avatar
                name={p?.nickname ?? "?"}
                src={p?.avatarUrl}
                kind={p?.avatarKind}
                size={30}
                seed={"mi" + uid}
                asStatic
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                {p?.nickname ?? t("friends.someone")} · {t("together.invitedShort")}
              </span>
            </li>
          );
        })}
      </ul>
      <div style={{ marginTop: 10 }}>
        <Button
          variant="secondary"
          size="sm"
          icon="plus"
          seed="minv"
          disabled={full}
          onClick={() => setInviteOpen(true)}
        >
          {t("together.inviteMore")}
        </Button>
      </div>
      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspace={workspace}
      />
    </Paper>
  );
}

function InviteDialog({
  open,
  onClose,
  workspace,
}: {
  open: boolean;
  onClose: () => void;
  workspace: Workspace;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: friends = [] } = useFriends();
  const invite = useInviteFriends();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const candidates = friends.filter(
    (f) => !workspace.members.includes(f.uid) && !workspace.invited.includes(f.uid),
  );
  const room = 8 - workspace.members.length - workspace.invited.length;
  const toggle = (uid: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else if (next.size < room) next.add(uid);
      return next;
    });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      width={460}
      seed="invite"
      tapes={1}
      title={t("together.inviteMore")}
      actions={
        <>
          <Button variant="quiet" seed="ivc" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            icon="send"
            seed="ivs"
            disabled={chosen.size === 0}
            loading={invite.isPending}
            onClick={() =>
              invite.mutate(
                { id: workspace.id, uids: [...chosen] },
                {
                  onSuccess: () => {
                    toast.push({
                      kind: "success",
                      title: t("together.invited", { count: chosen.size }),
                    });
                    setChosen(new Set());
                    onClose();
                  },
                  onError: () =>
                    toast.push({
                      kind: "error",
                      title: t("auth.errors.toastTitle"),
                      body: t("together.inviteFailed"),
                    }),
                },
              )
            }
          >
            {t("together.sendInvites")}
          </Button>
        </>
      }
    >
      <div style={{ margin: "8px 0 6px" }}>
        {candidates.length === 0 ? (
          <p style={{ margin: 0 }}>{t("together.nobodyToInvite")}</p>
        ) : (
          <ul className="zf-pick-list">
            {candidates.map((f) => {
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
                      size={30}
                      seed={"iv" + f.uid}
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
      </div>
    </Dialog>
  );
}
