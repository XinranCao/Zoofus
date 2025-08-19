import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import AuthForm from "../../components/auth/AuthForm";
import PasswordResetDialog from "../../components/auth/PasswordResetDialog";
import { Button, Divider, Box, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FcGoogle } from "react-icons/fc";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await login(email, password);
      navigate("/");
    } catch {
      setError("Failed to sign in");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      await loginWithGoogle();
      navigate("/");
    } catch {
      setError("Failed to sign in with Google");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: isMobile ? 1 : 0,
        bgcolor: "background.default",
      }}
    >
      <AuthForm
        title="Login"
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        onSubmit={handleEmailLogin}
        error={error}
        submitLabel="Log In"
      >
        <Button onClick={() => setResetOpen(true)} sx={{ mt: 1 }}>
          Forgot password?
        </Button>
        <Divider sx={{ my: 2 }} />
        <Button
          variant="outlined"
          onClick={handleGoogleLogin}
          fullWidth
          endIcon={<FcGoogle />}
        >
          Sign In with Google
        </Button>
        <Box sx={{ mt: 2 }}>
          Need an account? <Link to="/signup">Sign Up</Link>
        </Box>
      </AuthForm>
      <PasswordResetDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      />
    </Box>
  );
};

export default LoginPage;
