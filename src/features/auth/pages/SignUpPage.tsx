import { Box, Typography } from "@mui/material";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { compressImage } from "@/lib/image";
import { useSaveProfile } from "@/features/profile/useProfile";
import { AuthForm } from "../components/AuthForm";
import { ProfileSetupForm } from "../components/ProfileSetupForm";
import { useAuth } from "../useAuth";

export default function SignUpPage() {
  const { signup } = useAuth();
  const saveProfile = useSaveProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");

  const handleProfile = async ({ name, photo }: { name: string; photo: File | null }) => {
    try {
      setError("");
      const processed = photo ? await compressImage(photo, 0.2) : null;
      await saveProfile.mutateAsync({ displayName: name, photo: processed });
      navigate("/");
    } catch {
      setError("Failed to set up profile");
    }
  };

  return (
    <PageContainer>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: 1 }}>
        {step === 1 ? (
          <AuthForm
            title="Sign Up"
            submitLabel="Next"
            error={error}
            onSubmit={async ({ email, password }) => {
              try {
                setError("");
                await signup(email, password);
                setStep(2);
              } catch {
                setError("Failed to create an account");
              }
            }}
          >
            <Box sx={{ mt: 2 }}>
              Already have an account? <Link to="/login">Log In</Link>
            </Box>
          </AuthForm>
        ) : (
          <ProfileSetupForm loading={saveProfile.isPending} onSubmit={handleProfile} />
        )}
        {step === 2 && error && (
          <Typography color="error" align="center" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Box>
    </PageContainer>
  );
}
