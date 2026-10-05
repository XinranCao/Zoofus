import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { Paper } from "@/components/ui/Paper";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { friendName } from "@/features/social/social.schema";
import { useFriends } from "@/features/social/useSocial";
import { cn } from "@/lib/cn";
import { useInviteFriends, usePublicProfiles } from "./useTogether";
import type { Presence, Workspace } from "./workspace.schema";

/** "Here now" means seen within this long: two and a half heartbeats (a minute apart). */
const ONLINE_MS = 150_000;

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
  const { data: friends = [] } = useFriends();
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
      <ul className="zf-faces">
        {[...workspace.members, ...workspace.invited].map((uid) => {
          const invited = !workspace.members.includes(uid);
          const p = profiles.get(uid);
          // my own name for a friend if I gave one, else theirs
          const friend = friends.find((f) => f.uid === uid);
          const name =
            uid === me
              ? `${p?.nickname ?? ""} (${t("together.you")})`
              : friend
                ? friendName(friend, t("friends.someone"))
                : (p?.nickname ?? t("friends.someone"));
          const isOnline = !invited && (online.has(uid) || uid === me);
          const status = invited
            ? t("together.invitedShort")
            : isOnline
              ? t("together.online")
              : t("together.away");
          return (
            <li key={uid}>
              <Tooltip label={`${name} · ${status}`}>
                <button
                  type="button"
                  className={cn("zf-face-chip", invited && "is-invited")}
                  aria-label={`${name} · ${status}`}
                >
                  <Avatar
                    name={name}
                    src={p?.avatarUrl}
                    kind={p?.avatarKind}
                    size={34}
                    seed={"mp" + uid}
                    asStatic
                  />
                  {!invited && (
                    <span
                      className={cn("zf-dot", isOnline && "is-on")}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </Tooltip>
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
                  onSuccess: ({ invited, failed }) => {
                    if (failed.length) {
                      // keep the dialog open with only the ones that failed, ready to send again
                      toast.push({
                        kind: "error",
                        title: t("auth.errors.toastTitle"),
                        body: t("together.invitedSome", {
                          done: invited.length,
                          total: invited.length + failed.length,
                        }),
                      });
                      setChosen(new Set(failed));
                      return;
                    }
                    toast.push({
                      kind: "success",
                      title: t("together.invited", { count: invited.length }),
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
