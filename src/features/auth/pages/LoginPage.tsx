import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Scribble";
import { TextField } from "@/components/ui/TextField";
import { ToastNote } from "@/components/ui/Toast";
import { loginSchema, type Credentials } from "../auth.schema";
import { AuthLayout } from "../components/AuthLayout";
import { ResetPasswordDialog } from "../components/ResetPasswordDialog";
import { useAuth } from "../useAuth";

const WRONG = new Set([
  "auth/invalid-credential",
  "auth/wrong-password",
  "auth/user-not-found",
  "auth/invalid-email",
]);

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<"login" | "google" | null>(null);
  const [wrong, setWrong] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const {
    register,
    handleSubmit,
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async ({ email, password }: Credentials) => {
    setError(null);
    setWrong(false);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError("login");
      setWrong(WRONG.has((err as { code?: string }).code ?? ""));
      // keep what was typed for the email, clear only the password and put the cursor in it
      // (after the form has been enabled again: a disabled field cannot take focus)
      resetField("password");
      setTimeout(() => setFocus("password"), 0);
    }
  };

  const onGoogle = async () => {
    setError(null);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch {
      setError("google");
    }
  };

  return (
    <AuthLayout seed="login">
      {/* one sentence about the product, for someone who landed here without knowing it */}
      <p className="zf-muted zf-pitch" style={{ margin: "0 0 18px" }}>
        <b>{t("auth.login.pitch.kicker")}</b>{" "}
        <span className="zf-pitch-text">{t("auth.login.pitch.text")} </span>
        <Link
          to="/"
          style={{ color: "var(--ink-deep)", fontFamily: "var(--font-display)" }}
        >
          {t("auth.login.pitch.link")}
        </Link>
      </p>
      <div className="zf-kicker">{t("auth.login.kicker")}</div>
      <h1 className="zf-h1" style={{ margin: "6px 0 18px" }}>
        {t("auth.login.title")}
      </h1>
      {error && (
        <div id="login-error" style={{ marginBottom: 16 }}>
          <ToastNote
            kind="error"
            title={t("auth.errors.loginTitle")}
            body={t(error === "google" ? "auth.errors.google" : "auth.errors.login")}
            seed="login-error"
            role="alert"
            className="zf-toast--stack"
            action={
              error === "login" ? (
                <Button
                  variant="quiet"
                  size="sm"
                  seed="lerr-fg"
                  onClick={() => setResetOpen(true)}
                >
                  {t("auth.login.forgot")}
                </Button>
              ) : undefined
            }
          />
        </div>
      )}
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <fieldset
          disabled={isSubmitting}
          style={{
            display: "grid",
            gap: 16,
            border: 0,
            padding: 0,
            margin: 0,
            minWidth: 0,
          }}
        >
          <TextField
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            seed="em"
            error={errors.email ? t(errors.email.message!) : null}
            {...register("email")}
          />
          <TextField
            label={t("auth.password")}
            type="password"
            autoComplete="current-password"
            seed="pw"
            error={errors.password ? t(errors.password.message!) : null}
            // a wrong password is said once, in the banner above; the field only points at it
            aria-invalid={wrong || undefined}
            aria-describedby={wrong ? "login-error" : undefined}
            {...register("password")}
          />
        </fieldset>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 22,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Button variant="primary" type="submit" seed="sub" loading={isSubmitting}>
            {isSubmitting ? t("auth.login.loading") : t("auth.login.submit")}
          </Button>
          {/* while the banner is up it carries the one "Forgot password?" */}
          {error !== "login" && (
            <Button variant="quiet" seed="fg" onClick={() => setResetOpen(true)}>
              {t("auth.login.forgot")}
            </Button>
          )}
        </div>
      </form>
      <Divider seed="auth" />
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <GoogleButton onClick={onGoogle}>{t("auth.login.google")}</GoogleButton>
        </div>
        <p style={{ margin: 0, fontSize: 15 }}>
          {t("auth.login.newHere")}{" "}
          <Link
            to="/signup"
            style={{ color: "var(--ink-deep)", fontFamily: "var(--font-display)" }}
          >
            {t("auth.login.signUpLink")}
          </Link>
        </p>
      </div>
      <ResetPasswordDialog open={resetOpen} onOpenChange={setResetOpen} />
    </AuthLayout>
  );
}
