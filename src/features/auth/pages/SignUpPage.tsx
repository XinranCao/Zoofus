import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Scribble";
import { TextField } from "@/components/ui/TextField";
import { ToastNote } from "@/components/ui/Toast";
import { useSaveProfile } from "@/features/profile/useProfile";
import { prepareAvatar, UnsupportedImageError } from "@/lib/image";
import {
  profileFormSchema,
  signupSchema,
  type Credentials,
  type ProfileForm,
} from "../auth.schema";
import { AuthLayout } from "../components/AuthLayout";
import { useAuth } from "../useAuth";

/** Step 1: account. Step 2: nickname and an optional photo. */
export default function SignUpPage() {
  const { t } = useTranslation();
  const { signup, currentUser } = useAuth();
  const navigate = useNavigate();
  // After step 1 the account exists, so "Back" never creates it twice.
  const [step, setStep] = useState<1 | 2>(1);
  const created = Boolean(currentUser);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});

  const account = useForm<Credentials>({ resolver: zodResolver(signupSchema) });
  const profileForm = useForm<ProfileForm>({ resolver: zodResolver(profileFormSchema) });
  const nickname = useWatch({ control: profileForm.control, name: "name" });
  const saveProfile = useSaveProfile();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onAccount = async ({ email, password }: Credentials) => {
    setError(null);
    setFieldError({});
    if (created) return setStep(2); // came back from step 2: the account already exists
    try {
      await signup(email, password);
      // suggest a name from the email, so the step can be finished with one press
      if (!profileForm.getValues("name"))
        profileForm.setValue("name", email.split("@")[0]!.slice(0, 40));
      setStep(2);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use")
        setFieldError({ email: t("auth.errors.emailInUse") });
      else if (code === "auth/weak-password")
        setFieldError({ password: t("auth.errors.weakPassword") });
      else setError(t("auth.errors.signup"));
    }
  };

  const onProfile = async ({ name }: ProfileForm) => {
    setError(null);
    try {
      const processed = photo ? await prepareAvatar(photo) : null;
      await saveProfile.mutateAsync({ displayName: name, photo: processed });
      navigate("/");
    } catch (err) {
      setError(
        err instanceof UnsupportedImageError ? err.message : t("auth.errors.profile"),
      );
    }
  };

  const pickPhoto = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const errorToast = error && (
    <div style={{ marginBottom: 16 }}>
      <ToastNote
        kind="error"
        title={t("auth.errors.toastTitle")}
        body={error}
        seed="signup-error"
        role="alert"
      />
    </div>
  );

  if (step === 2) {
    const busy = profileForm.formState.isSubmitting || saveProfile.isPending;
    return (
      <AuthLayout seed="signup2">
        <div className="zf-kicker">{t("auth.signup.kicker2")}</div>
        <h1 className="zf-h1" style={{ margin: "6px 0 18px" }}>
          {t("auth.signup.title2")}
        </h1>
        {errorToast}
        <form noValidate onSubmit={profileForm.handleSubmit(onProfile)}>
          <fieldset
            disabled={busy}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <div
              style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 18 }}
            >
              <Avatar
                size={72}
                name={nickname}
                src={preview}
                asStatic
                seed="signup-avatar"
              />
              <div style={{ display: "grid", gap: 4 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="upload"
                  seed="ph"
                  onClick={() => fileInput.current?.click()}
                >
                  {photo ? t("auth.signup.changePhoto") : t("auth.signup.addPhoto")}
                </Button>
                <span className="zf-muted">{t("auth.signup.photoHint")}</span>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
                  aria-label={t("auth.signup.addPhoto")}
                />
              </div>
            </div>
            <TextField
              label={t("auth.nickname")}
              required
              placeholder={t("auth.nicknamePlaceholder")}
              hint={t("auth.nicknameHint")}
              seed="nn"
              autoComplete="nickname"
              error={
                profileForm.formState.errors.name
                  ? t(profileForm.formState.errors.name.message!)
                  : null
              }
              {...profileForm.register("name")}
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
            <Button variant="primary" type="submit" seed="go" loading={busy}>
              {busy ? t("auth.signup.starting") : t("auth.signup.start")}
            </Button>
            <Button variant="quiet" seed="bk" onClick={() => setStep(1)}>
              {t("auth.signup.back")}
            </Button>
          </div>
        </form>
      </AuthLayout>
    );
  }

  const busy = account.formState.isSubmitting;
  return (
    <AuthLayout seed="signup1">
      <div className="zf-kicker">{t("auth.signup.kicker1")}</div>
      <h1 className="zf-h1" style={{ margin: "6px 0 18px" }}>
        {t("auth.signup.title1")}
      </h1>
      {created && <p style={{ margin: "0 0 16px" }}>{t("auth.signup.created")}</p>}
      {errorToast}
      <form noValidate onSubmit={account.handleSubmit(onAccount)}>
        <fieldset
          disabled={busy}
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
            readOnly={created}
            error={
              account.formState.errors.email
                ? t(account.formState.errors.email.message!)
                : (fieldError.email ?? null)
            }
            {...account.register("email")}
          />
          {!created && (
            <TextField
              label={t("auth.password")}
              type="password"
              autoComplete="new-password"
              seed="pw"
              hint={t("auth.passwordHint")}
              error={
                account.formState.errors.password
                  ? t(account.formState.errors.password.message!)
                  : (fieldError.password ?? null)
              }
              {...account.register("password")}
            />
          )}
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
          <Button variant="primary" type="submit" seed="sub" loading={busy}>
            {busy ? t("auth.signup.creating") : t("auth.signup.continue")}
          </Button>
        </div>
      </form>
      <Divider seed="auth" />
      <p style={{ margin: 0, fontSize: 15 }}>
        {t("auth.signup.have")}{" "}
        <Link
          to="/login"
          style={{ color: "var(--ink-deep)", fontFamily: "var(--font-display)" }}
        >
          {t("auth.signup.logInLink")}
        </Link>
      </p>
    </AuthLayout>
  );
}
