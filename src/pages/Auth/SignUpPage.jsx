import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import AuthForm from "../../components/auth/AuthForm";
import ProfileSetupForm from "../../components/auth/ProfileSetupForm";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const SignUpPage = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, updateProfile } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Step 1: Email & Password
  const handleStep1 = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      setError("");
      await signup(email, password);
      setStep(2);
    } catch {
      setError("Failed to create an account");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Name & Photo
  const handleStep2 = async ({ name, photo }) => {
    setLoading(true);
    try {
      await updateProfile({ displayName: name, photo });
      navigate("/");
    } catch {
      setError("Failed to set up profile");
    } finally {
      setLoading(false);
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
      {step === 1 ? (
        <AuthForm
          title="Sign Up"
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onSubmit={handleStep1}
          error={error}
          submitLabel="Next"
        >
          <Box sx={{ mt: 2 }}>
            Already have an account? <Link to="/login">Log In</Link>
          </Box>
        </AuthForm>
      ) : (
        <ProfileSetupForm onSubmit={handleStep2} loading={loading} />
      )}
      {error && (
        <Typography color="error" align="center" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default SignUpPage;
