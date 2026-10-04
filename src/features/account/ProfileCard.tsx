import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Paper } from "@/components/ui/Paper";
import { Tape } from "@/components/ui/Tape";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/features/auth/useAuth";
import { useProfile, useProfileEdits } from "@/features/profile/useProfile";
import { MAX_NICKNAME, nicknameSchema } from "@/features/profile/profile.schema";
import { StickerMakerDialog as LazyStickerMaker } from "@/features/stickers/editor/LazyStickerMaker";
import { StickerPickerDialog } from "@/features/stickers/library/StickerPicker";
import type { Sticker } from "@/features/stickers/library/sticker.schema";
import { COMPRESSION, encodeWithin } from "@/lib/image";
import { loadImage } from "@/paper/renderSticker";

/** Nickname and picture. The picture is made in the sticker maker, or taken from a sticker you have. */
export function ProfileCard() {
  const { t } = useTranslation();
  const toast = useToast();
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const { data: profile } = useProfile(uid);
  const { rename, setPicture, removePicture } = useProfileEdits(uid, profile);
  const [draft, setDraft] = useState<string | null>(null);
  const [makerOpen, setMakerOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);

  const nickname = draft ?? profile?.nickname ?? "";
  const valid = nicknameSchema.safeParse(nickname).success;
  const changed = valid && nickname.trim() !== (profile?.nickname ?? "");

  const applyCanvas = async (canvas: HTMLCanvasElement) => {
    const { blob } = await encodeWithin(canvas, COMPRESSION.stickerAvatar);
    await setPicture.mutateAsync(blob);
    toast.push({ kind: "success", title: t("account.pictureSaved") });
  };

  const applySticker = async (sticker: Sticker) => {
    setPickOpen(false);
    try {
      const img = await loadImage(sticker.imageUrl, "anonymous");
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      await applyCanvas(canvas);
    } catch (err) {
      console.error("Using a sticker as the picture failed", err);
      toast.push({
        kind: "error",
        title: t("auth.errors.toastTitle"),
        body: t("account.pictureFailed"),
      });
    }
  };

  if (!uid) return null;
  const name = profile?.nickname || currentUser?.email?.split("@")[0] || "";
  return (
    <Paper
      seed="acct-profile"
      size="lg"
      tone="scrap"
      rotate={-0.5}
      tape={<Tape seed="ap" x="16%" y="4px" color="tape-pink" />}
      faceStyle={{ padding: "28px 26px" }}
    >
      <h2 className="zf-h2">{t("account.profileTitle")}</h2>
      <div className="zf-profile">
        <div className="zf-profile__pic">
          <Avatar
            name={name}
            src={profile?.profilePictureUrl}
            kind={profile?.avatarKind}
            size={96}
            seed="profile-pic"
            asStatic
          />
          <div className="zf-profile__picbtns">
            <Button
              variant="secondary"
              size="sm"
              icon="lasso"
              seed="pmk"
              loading={setPicture.isPending}
              onClick={() => setMakerOpen(true)}
            >
              {t("account.makePicture")}
            </Button>
            <Button
              variant="quiet"
              size="sm"
              icon="image"
              seed="ppk"
              onClick={() => setPickOpen(true)}
            >
              {t("account.pickPicture")}
            </Button>
            {profile?.profilePictureUrl && (
              <Button
                variant="quiet"
                size="sm"
                icon="trash"
                seed="prm"
                loading={removePicture.isPending}
                onClick={() => removePicture.mutate()}
              >
                {t("account.removePicture")}
              </Button>
            )}
          </div>
        </div>
        <form
          className="zf-profile__name"
          onSubmit={(e) => {
            e.preventDefault();
            if (!changed) return;
            rename.mutate(nickname.trim(), {
              onSuccess: () => {
                setDraft(null);
                toast.push({ kind: "success", title: t("account.nicknameSaved") });
              },
              onError: () =>
                toast.push({
                  kind: "error",
                  title: t("auth.errors.toastTitle"),
                  body: t("account.nicknameFailed"),
                }),
            });
          }}
        >
          <TextField
            label={t("auth.nickname")}
            seed="pnick"
            value={nickname}
            maxLength={MAX_NICKNAME}
            hint={t("account.nicknameHint")}
            error={draft !== null && !valid ? t("auth.errors.name") : undefined}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div style={{ marginTop: 14 }}>
            <Button
              variant="primary"
              type="submit"
              icon="check"
              seed="psave"
              disabled={!changed}
              loading={rename.isPending}
            >
              {t("common.save")}
            </Button>
          </div>
        </form>
      </div>

      <LazyStickerMaker
        open={makerOpen}
        onOpenChange={setMakerOpen}
        onAvatar={applyCanvas}
      />
      <StickerPickerDialog
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        onPick={(s) => void applySticker(s)}
        title={t("account.pickPictureTitle")}
      />
    </Paper>
  );
}
