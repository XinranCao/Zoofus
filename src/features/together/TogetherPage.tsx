import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Paper } from "@/components/ui/Paper";
import { Sticker as Art } from "@/components/ui/Sticker";
import { Tape } from "@/components/ui/Tape";
import { useToast } from "@/components/ui/Toast";
import { PaperPreview } from "@/features/journal/PageSetup";
import { ensureFontsFor } from "@/lib/cjkFonts";
import { useMakeParam } from "@/lib/useMakeParam";
import { NewWorkspaceDialog } from "./NewWorkspaceDialog";
import {
  useAcceptInvite,
  useDeclineInvite,
  useDeleteWorkspace,
  useLeaveWorkspace,
  usePublicProfiles,
  useWorkspaces,
} from "./useTogether";
import { WorkspaceError } from "./workspace.api";
import type { Workspace } from "./workspace.schema";
import { useAuth } from "@/features/auth/useAuth";

/** Together: shared journals you make live with friends, and the invitations to join one. */
export default function TogetherPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();
  const me = currentUser?.uid ?? "";
  const { data, isPending } = useWorkspaces();
  const accept = useAcceptInvite();
  const decline = useDeclineInvite();
  const leave = useLeaveWorkspace();
  const remove = useDeleteWorkspace();
  const [newOpen, setNewOpen] = useState(false);
  const [ending, setEnding] = useState<Workspace | null>(null);
  useMakeParam(() => setNewOpen(true));

  const mine = data?.mine ?? [];
  const invites = data?.invites ?? [];

  return (
    <div className="zf-page">
      <PageHeader
        title={t("together.title")}
        lead={t("together.lead")}
        art={["friends", "notebook"]}
        actions={
          <Button
            variant={mine.length ? "primary" : "secondary"}
            icon="plus"
            seed="tnew"
            onClick={() => setNewOpen(true)}
          >
            {t("together.new")}
          </Button>
        }
      />

      {invites.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 className="zf-h1" style={{ margin: "0 0 14px" }}>
            {t("together.invites", { count: invites.length })}
          </h2>
          <ul className="zf-people">
            {invites.map((w) => (
              <InviteRow
                key={w.id}
                workspace={w}
                onAccept={() =>
                  accept.mutate(w.id, {
                    onSuccess: () =>
                      toast.push({
                        kind: "success",
                        title: t("together.joined", { title: w.title }),
                      }),
                    onError: (err) =>
                      toast.push({
                        kind: "error",
                        title: t("auth.errors.toastTitle"),
                        body:
                          err instanceof WorkspaceError && err.code === "full"
                            ? t("together.full")
                            : t("together.joinFailed"),
                      }),
                  })
                }
                onDecline={() => decline.mutate(w.id)}
                busy={accept.isPending || decline.isPending}
              />
            ))}
          </ul>
        </section>
      )}

      {isPending && <div aria-busy="true" />}
      {!isPending && mine.length === 0 && (
        <EmptyState
          seed="together-empty"
          title={t("together.emptyTitle")}
          art={<Art art="friends" size={80} />}
          action={
            <Button
              variant="primary"
              icon="plus"
              seed="tfirst"
              onClick={() => setNewOpen(true)}
            >
              {t("together.new")}
            </Button>
          }
        >
          {t("together.emptyBody")}
        </EmptyState>
      )}
      {mine.length > 0 && (
        <ul
          className="zf-grid-journal"
          style={{ listStyle: "none", margin: 0, padding: 0 }}
        >
          {mine.map((w, i) => (
            <li key={w.id}>
              <WorkspaceCard
                workspace={w}
                index={i}
                me={me}
                onEnd={() => setEnding(w)}
                onLeave={() => leave.mutate(w.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <NewWorkspaceDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        existing={mine.length}
      />
      <ConfirmDialog
        open={ending !== null}
        title={t("together.endTitle", { title: ending?.title ?? "" })}
        body={t("together.endBody")}
        confirmLabel={t("together.end")}
        loading={remove.isPending}
        onCancel={() => setEnding(null)}
        onConfirm={() =>
          ending &&
          remove.mutate(ending.id, {
            onSuccess: () => {
              toast.push({ kind: "info", title: t("together.ended") });
              setEnding(null);
            },
          })
        }
      />
    </div>
  );
}

function InviteRow({
  workspace,
  onAccept,
  onDecline,
  busy,
}: {
  workspace: Workspace;
  onAccept: () => void;
  onDecline: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const people = usePublicProfiles([workspace.ownerUid]);
  const owner = people.get(workspace.ownerUid);
  ensureFontsFor(workspace.title);
  return (
    <li className="zf-person">
      <Avatar
        name={owner?.nickname ?? "?"}
        src={owner?.avatarUrl}
        kind={owner?.avatarKind}
        size={44}
        seed={"inv" + workspace.id}
        asStatic
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="zf-h2" style={{ fontSize: 17 }}>
          {workspace.title}
        </div>
        <div className="zf-muted" style={{ fontSize: 13 }}>
          {t("together.invitedBy", { name: owner?.nickname ?? t("friends.someone") })}
        </div>
      </div>
      <Button
        variant="primary"
        size="sm"
        icon="check"
        seed={"ia" + workspace.id}
        disabled={busy}
        onClick={onAccept}
      >
        {t("together.join")}
      </Button>
      <Button
        variant="quiet"
        size="sm"
        seed={"id" + workspace.id}
        disabled={busy}
        onClick={onDecline}
      >
        {t("friends.decline")}
      </Button>
    </li>
  );
}

function WorkspaceCard({
  workspace,
  index,
  me,
  onEnd,
  onLeave,
}: {
  workspace: Workspace;
  index: number;
  me: string;
  onEnd: () => void;
  onLeave: () => void;
}) {
  const { t, i18n } = useTranslation();
  const people = usePublicProfiles(workspace.members);
  ensureFontsFor(workspace.title);
  const owner = workspace.ownerUid === me;
  return (
    <figure className="zf-tile">
      <Link
        to={`/together/${workspace.id}`}
        className="zf-tile__open"
        style={{
          textDecoration: "none",
          color: "inherit",
          width: "100%",
          justifyItems: "stretch",
        }}
        aria-label={t("together.open", { title: workspace.title })}
      >
        <span className="zf-tile__name" style={{ marginBottom: 4, textAlign: "center" }}>
          {workspace.title}
        </span>
        <Paper
          seed={"wc" + workspace.id}
          size="sm"
          tone="sheet-50"
          rotate={1.1}
          w={190}
          h={260}
          style={{ width: "100%" }}
          faceStyle={{ padding: 6 }}
          tape={
            index % 2 === 0 ? (
              <Tape
                seed={"wt" + workspace.id}
                x="50%"
                y="2px"
                length={54}
                thickness={16}
              />
            ) : undefined
          }
        >
          {workspace.thumb ? (
            <img
              src={workspace.thumb}
              alt=""
              width={170}
              style={{ display: "block", width: 170, height: "auto" }}
            />
          ) : (
            <PaperPreview page={workspace.page} width={170} />
          )}
        </Paper>
      </Link>
      <div
        style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}
        aria-label={t("together.members")}
      >
        {workspace.members.map((uid) => {
          const p = people.get(uid);
          return (
            <Avatar
              key={uid}
              name={p?.nickname ?? "?"}
              src={p?.avatarUrl}
              kind={p?.avatarKind}
              size={30}
              seed={"wm" + workspace.id + uid}
              asStatic
            />
          );
        })}
      </div>
      <span className="zf-tile__meta">
        {new Intl.DateTimeFormat(i18n.language, {
          day: "numeric",
          month: "short",
        }).format(workspace.updatedAt)}
      </span>
      <div className="zf-tile__actions" style={{ opacity: 1 }}>
        {owner ? (
          <Button
            variant="quiet"
            size="sm"
            icon="trash"
            seed={"we" + workspace.id}
            onClick={onEnd}
          >
            {t("together.end")}
          </Button>
        ) : (
          <Button
            variant="quiet"
            size="sm"
            icon="logout"
            seed={"wl" + workspace.id}
            onClick={onLeave}
          >
            {t("together.leave")}
          </Button>
        )}
      </div>
    </figure>
  );
}
