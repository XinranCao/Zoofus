import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingNote, Skeleton } from "@/components/ui/Loader";
import { PageHeader } from "@/components/ui/PageHeader";
import { Paper } from "@/components/ui/Paper";
import { Sticker as Art } from "@/components/ui/Sticker";
import { Tape } from "@/components/ui/Tape";
import { TextField } from "@/components/ui/TextField";
import { ToggleGroup } from "@/components/ui/ToggleGroup";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/useAuth";
import { ensureFontsFor } from "@/lib/cjkFonts";
import { useMakeParam } from "@/lib/useMakeParam";
import { formatCode } from "./friendCode";
import { SharedWithYou } from "./SharedWithYou";
import { SocialError, findByCode } from "./social.api";
import {
  MAX_FRIEND_NAME,
  friendName,
  type Friend,
  type PublicProfile,
} from "./social.schema";
import {
  useAcceptRequest,
  useCancelRequest,
  useDeclineRequest,
  useFriendNickname,
  useFriends,
  useIncomingRequests,
  useInbox,
  useMyPublicProfile,
  useRemoveFriend,
  useSendRequest,
  useSentRequests,
} from "./useSocial";

type Tab = "friends" | "requests" | "shared";

/** Friends: your code, adding people, requests, the friends you have, and what they shared. */
export default function FriendsPage() {
  const { t } = useTranslation();
  const { data: friends = [] } = useFriends();
  const { data: incoming = [] } = useIncomingRequests();
  const { data: inbox = [] } = useInbox();
  const waiting = inbox.filter((s) => !s.saved).length; // what is still in "Shared with you"
  const [tab, setTab] = useState<Tab>("friends");
  useMakeParam(() => setTab("friends"));

  return (
    <div className="zf-page">
      <PageHeader
        title={t("friends.title")}
        lead={t("friends.lead")}
        art={["friends", "envelope"]}
      />
      <div className="zf-friends-top">
        <CodeCard />
        <AddFriendCard />
      </div>
      <div style={{ margin: "30px 0 18px" }}>
        <ToggleGroup<Tab>
          label={t("friends.sections")}
          seed="ftab"
          value={tab}
          onChange={setTab}
          options={[
            {
              value: "friends",
              label: t("friends.tabFriends", { count: friends.length }),
            },
            {
              value: "requests",
              label: t("friends.tabRequests", { count: incoming.length }),
            },
            { value: "shared", label: t("friends.tabShared", { count: waiting }) },
          ]}
        />
      </div>
      {tab === "friends" && <FriendList />}
      {tab === "requests" && <Requests />}
      {tab === "shared" && <SharedWithYou />}
    </div>
  );
}

function CodeCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: me, isError, refetch } = useMyPublicProfile();
  const code = me?.friendCode;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (code) return;
    const timer = setTimeout(() => setSlow(true), 5000);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [code]);
  return (
    <Paper
      seed="fcode"
      size="md"
      tone="scrap"
      rotate={-0.6}
      tape={<Tape seed="fct" x="18%" y="4px" color="tape-mustard" />}
      faceStyle={{ padding: "26px 24px" }}
    >
      <h2 className="zf-h2">{t("friends.yourCode")}</h2>
      <p className="zf-muted" style={{ margin: "6px 0 14px" }}>
        {t("friends.yourCodeHint")}
      </p>
      <div className="zf-code" aria-live="polite">
        {code ? formatCode(code) : "········"}
      </div>
      {!code && (isError || slow) && (
        <p role="status" style={{ margin: "0 0 10px" }}>
          {t("friends.codeFailed")}{" "}
          <Button
            variant="secondary"
            size="sm"
            seed="fretry"
            onClick={() => void refetch()}
          >
            {t("friends.codeRetry")}
          </Button>
        </p>
      )}
      <Button
        variant="secondary"
        size="sm"
        icon="copy"
        seed="fcopy"
        disabled={!code}
        onClick={() => {
          void navigator.clipboard
            ?.writeText(formatCode(code!))
            .then(() => toast.push({ kind: "success", title: t("friends.copied") }))
            .catch(() => {});
        }}
      >
        {t("friends.copy")}
      </Button>
    </Paper>
  );
}

function AddFriendCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();
  const send = useSendRequest();
  const [text, setText] = useState("");
  const [found, setFound] = useState<{ uid: string; profile: PublicProfile } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const find = async () => {
    setError(null);
    setFound(null);
    setBusy(true);
    try {
      const r = await findByCode(text);
      if (r.uid === currentUser?.uid) setError(t("friends.errors.self"));
      else setFound(r);
    } catch (err) {
      const code = err instanceof SocialError ? err.code : "other";
      setError(
        t(
          code === "bad-code"
            ? "friends.errors.badCode"
            : code === "not-found"
              ? "friends.errors.notFound"
              : "friends.errors.other",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper
      seed="fadd"
      size="md"
      tone="scrap-cool"
      rotate={0.5}
      faceStyle={{ padding: "26px 24px" }}
    >
      <h2 className="zf-h2">{t("friends.addTitle")}</h2>
      <form
        style={{ marginTop: 12, display: "grid", gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          void find();
        }}
      >
        <TextField
          label={t("friends.theirCode")}
          seed="fcodein"
          value={text}
          maxLength={12}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="ABCD-2345"
          error={error}
          onChange={(e) => setText(e.target.value)}
        />
        <div>
          <Button
            variant="primary"
            type="submit"
            icon="users"
            seed="ffind"
            disabled={!text.trim()}
            loading={busy}
          >
            {t("friends.find")}
          </Button>
        </div>
      </form>
      {found && (
        <div className="zf-person" style={{ marginTop: 16 }}>
          <Avatar
            name={found.profile.nickname}
            src={found.profile.avatarUrl}
            kind={found.profile.avatarKind}
            size={44}
            seed="found"
            asStatic
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="zf-h2" style={{ fontSize: 17 }}>
              {found.profile.nickname}
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon="plus"
            seed="fsend"
            loading={send.isPending}
            onClick={() =>
              send.mutate(found.uid, {
                onSuccess: (r) => {
                  toast.push({
                    kind: "success",
                    title: t(
                      r === "accepted" ? "friends.nowFriends" : "friends.requestSent",
                      { name: found.profile.nickname },
                    ),
                  });
                  setFound(null);
                  setText("");
                },
                onError: (err) => {
                  const c = err instanceof SocialError ? err.code : "other";
                  setError(
                    t(
                      c === "already-friends"
                        ? "friends.errors.already"
                        : c === "already-sent"
                          ? "friends.errors.alreadySent"
                          : "friends.errors.other",
                    ),
                  );
                },
              })
            }
          >
            {t("friends.addFriend")}
          </Button>
        </div>
      )}
    </Paper>
  );
}

function ListLoading({ text }: { text: string }) {
  return (
    <div aria-busy="true">
      <LoadingNote text={text} />
      <div style={{ display: "grid", gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} seed={"fsk" + i} width="100%" height={56} />
        ))}
      </div>
    </div>
  );
}

function FriendList() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: friends = [], isPending } = useFriends();
  const { data: sent = [] } = useSentRequests();
  const cancel = useCancelRequest();
  const remove = useRemoveFriend();
  const [naming, setNaming] = useState<Friend | null>(null);
  const [removing, setRemoving] = useState<Friend | null>(null);

  if (isPending) return <ListLoading text={t("friends.loadingList")} />;
  return (
    <div style={{ display: "grid", gap: 28 }}>
      {friends.length === 0 ? (
        <EmptyState
          seed="nofriends"
          title={t("friends.emptyTitle")}
          art={<Art art="friends" size={80} />}
        >
          {t("friends.emptyBody")}
        </EmptyState>
      ) : (
        <ul className="zf-people">
          {friends.map((f) => {
            const name = friendName(f, t("friends.someone"));
            ensureFontsFor(name);
            return (
              <li key={f.uid} className="zf-person">
                <Avatar
                  name={name}
                  src={f.profile?.avatarUrl}
                  kind={f.profile?.avatarKind}
                  size={48}
                  seed={"fr" + f.uid}
                  asStatic
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="zf-h2" style={{ fontSize: 17 }}>
                    {name}
                  </div>
                  {f.alias && f.profile && f.profile.nickname !== f.alias && (
                    <div className="zf-muted" style={{ fontSize: 13 }}>
                      {t("friends.goesBy", { name: f.profile.nickname })}
                    </div>
                  )}
                </div>
                <Button
                  variant="quiet"
                  size="sm"
                  icon="pencil"
                  seed={"fn" + f.uid}
                  aria-label={t("friends.nameThem", { name })}
                  onClick={() => setNaming(f)}
                >
                  {t("friends.name")}
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  icon="trash"
                  seed={"fx" + f.uid}
                  aria-label={t("friends.remove", { name })}
                  onClick={() => setRemoving(f)}
                >
                  {t("friends.removeShort")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {sent.length > 0 && (
        <section>
          <h2 className="zf-h1" style={{ margin: "0 0 12px" }}>
            {t("friends.waiting")}
          </h2>
          <ul className="zf-people">
            {sent.map((s) => (
              <li key={s.to} className="zf-person">
                <Avatar
                  name={s.profile?.nickname ?? "?"}
                  src={s.profile?.avatarUrl}
                  kind={s.profile?.avatarKind}
                  size={40}
                  seed={"sn" + s.to}
                  asStatic
                />
                <div style={{ flex: 1 }}>
                  {s.profile?.nickname ?? t("friends.someone")}
                </div>
                <Button
                  variant="quiet"
                  size="sm"
                  seed={"sc" + s.to}
                  onClick={() => cancel.mutate(s.to)}
                >
                  {t("friends.cancel")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NameDialog friend={naming} onClose={() => setNaming(null)} />
      <ConfirmDialog
        open={removing !== null}
        title={t("friends.removeTitle", {
          name: removing ? friendName(removing, t("friends.someone")) : "",
        })}
        body={t("friends.removeBody")}
        confirmLabel={t("friends.removeShort")}
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() =>
          removing &&
          remove.mutate(removing.uid, {
            onSuccess: () => {
              toast.push({ kind: "info", title: t("friends.removed") });
              setRemoving(null);
            },
          })
        }
      />
    </div>
  );
}

function NameDialog({ friend, onClose }: { friend: Friend | null; onClose: () => void }) {
  return friend ? <NameBody key={friend.uid} friend={friend} onClose={onClose} /> : null;
}
function NameBody({ friend, onClose }: { friend: Friend; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const set = useFriendNickname();
  const [name, setName] = useState(friend.alias ?? "");
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      width={420}
      seed="friend-name"
      tapes={1}
      title={t("friends.nameTitle", {
        name: friend.profile?.nickname ?? t("friends.someone"),
      })}
      actions={
        <>
          <Button variant="quiet" seed="fnc" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            icon="check"
            seed="fns"
            loading={set.isPending}
            onClick={() =>
              set.mutate(
                { friend: friend.uid, nickname: name },
                {
                  onSuccess: onClose,
                  onError: () =>
                    toast.push({
                      kind: "error",
                      title: t("auth.errors.toastTitle"),
                      body: t("friends.errors.other"),
                    }),
                },
              )
            }
          >
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div style={{ margin: "8px 0 6px" }}>
        <TextField
          label={t("friends.yourName")}
          seed="fnt"
          value={name}
          maxLength={MAX_FRIEND_NAME}
          hint={t("friends.nameHint")}
          placeholder={friend.profile?.nickname}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </Dialog>
  );
}

function Requests() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: incoming = [], isPending } = useIncomingRequests();
  const accept = useAcceptRequest();
  const decline = useDeclineRequest();
  if (isPending) return <ListLoading text={t("friends.loadingRequests")} />;
  if (incoming.length === 0)
    return (
      <EmptyState
        seed="noreq"
        title={t("friends.noRequests")}
        art={<Art art="envelope" size={74} />}
      >
        {t("friends.noRequestsBody")}
      </EmptyState>
    );
  return (
    <ul className="zf-people">
      {incoming.map((r) => {
        const name = r.profile?.nickname ?? t("friends.someone");
        return (
          <li key={r.from} className="zf-person">
            <Avatar
              name={name}
              src={r.profile?.avatarUrl}
              kind={r.profile?.avatarKind}
              size={48}
              seed={"rq" + r.from}
              asStatic
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="zf-h2" style={{ fontSize: 17 }}>
                {name}
              </div>
              <div className="zf-muted" style={{ fontSize: 13 }}>
                {t("friends.wantsToBe")}
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon="check"
              seed={"ra" + r.from}
              loading={accept.isPending && accept.variables === r.from}
              onClick={() =>
                accept.mutate(r.from, {
                  onSuccess: () =>
                    toast.push({
                      kind: "success",
                      title: t("friends.nowFriends", { name }),
                    }),
                })
              }
            >
              {t("friends.accept")}
            </Button>
            <Button
              variant="quiet"
              size="sm"
              seed={"rd" + r.from}
              onClick={() => decline.mutate(r.from)}
            >
              {t("friends.decline")}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
