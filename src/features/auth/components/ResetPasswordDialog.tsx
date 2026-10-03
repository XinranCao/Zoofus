import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogBody } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { resetSchema, type ResetForm } from "../auth.schema";
import { useAuth } from "../useAuth";

/** A 420px dialog over the auth page: email, "Send link", then a success toast. */
export function ResetPasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const toast = useToast();
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  const onSubmit = async ({ email }: ResetForm) => {
    setFailed(false);
    try {
      await resetPassword(email);
      toast.push({
        kind: "success",
        title: t("auth.reset.sent"),
        body: t("auth.reset.sentBody"),
      });
      reset();
      onOpenChange(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      seed="reset"
      width={420}
      kicker={t("auth.reset.kicker")}
      title={t("auth.reset.title")}
      actions={
        <>
          <Button variant="quiet" seed="rc" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            seed="rs"
            type="submit"
            form="reset-form"
            loading={isSubmitting}
          >
            {isSubmitting ? t("auth.reset.sending") : t("auth.reset.send")}
          </Button>
        </>
      }
    >
      <form id="reset-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogBody>{t("auth.reset.body")}</DialogBody>
        <div style={{ marginBottom: 20 }}>
          <TextField
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            seed="rem"
            error={
              errors.email
                ? t(errors.email.message!)
                : failed
                  ? t("auth.errors.reset")
                  : null
            }
            {...register("email")}
          />
        </div>
      </form>
    </Dialog>
  );
}
