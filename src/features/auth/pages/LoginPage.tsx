import { Box, Button, Divider } from "@mui/material";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { Link, useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import { AuthForm } from "../components/AuthForm";
import { PasswordResetDialog } from "../components/PasswordResetDialog";
import { useAuth } from "../useAuth";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <PageContainer>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", px: 1 }}>
        <AuthForm
          title="Login"
          submitLabel="Log In"
          error={error}
          onSubmit={async ({ email, password }) => {
            try {
              setError("");
              await login(email, password);
              navigate("/");
            } catch {
              setError("Failed to sign in");
            }
          }}
        >
          <Button onClick={() => setResetOpen(true)}>Forgot password?</Button>
          <Divider sx={{ mb: 2 }} />
          <Button
            variant="outlined"
            fullWidth
            endIcon={<FcGoogle />}
            onClick={async () => {
              try {
                setError("");
                await loginWithGoogle();
                navigate("/");
              } catch {
                setError("Failed to sign in with Google");
              }
            }}
          >
            Sign In with Google
          </Button>
          <Box sx={{ mt: 2 }}>
            Need an account? <Link to="/signup">Sign Up</Link>
          </Box>
        </AuthForm>
        <PasswordResetDialog open={resetOpen} onClose={() => setResetOpen(false)} />
      </Box>
    </PageContainer>
  );
}
