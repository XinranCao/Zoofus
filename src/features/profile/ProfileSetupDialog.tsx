import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { useAuth } from "@/features/auth/useAuth";
import { MAX_NICKNAME, nicknameSchema } from "./profile.schema";
import { useProfile, useSaveProfile } from "./useProfile";

/**
 * Everyone has a nickname. People who signed in with Google, or whose profile was never written,
 * are asked for one before they go on (it is how friends see them).
 */
export function ProfileSetupDialog() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { data: profile, isPending } = useProfile(currentUser?.uid);
  const save = useSaveProfile();
  const [name, setName] = useState<string | null>(null);
  const { pathname } = useLocation();

  // sign-up has its own step for this: wait until it has run
  if (!currentUser || isPending || profile || pathname === "/signup") return null;
  const value = name ?? currentUser.displayName ?? currentUser.email?.split("@")[0] ?? "";
  const valid = nicknameSchema.safeParse(value).success;
  return (
    <Dialog
      open
      onOpenChange={() => {}}
      hideClose
      onEscapeKeyDown={(e) => e.preventDefault()}
      onInteractOutside={(e) => e.preventDefault()}
      width={440}
      seed="setup"
      tapes={1}
      kicker={t("profileSetup.kicker")}
      title={t("profileSetup.title")}
      actions={
        <Button
          variant="primary"
          icon="check"
          seed="setup-go"
          disabled={!valid}
          loading={save.isPending}
          type="submit"
          form="profile-setup-form"
        >
          {t("profileSetup.go")}
        </Button>
      }
    >
      <DialogBody>{t("profileSetup.body")}</DialogBody>
      {/* a real form, so Enter in the field continues */}
      <form
        id="profile-setup-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (valid && !save.isPending) save.mutate({ displayName: value.trim() });
        }}
      >
        <TextField
          label={t("auth.nickname")}
          required
          seed="setup-name"
          value={value}
          maxLength={MAX_NICKNAME}
          onChange={(e) => setName(e.target.value)}
          error={name !== null && !valid ? t("auth.errors.name") : undefined}
        />
      </form>
    </Dialog>
  );
}
