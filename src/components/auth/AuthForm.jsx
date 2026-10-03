import {
  Box,
  TextField,
  Button,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

const AuthForm = ({
  title,
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  error,
  submitLabel,
  children,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        boxSizing: "border-box",
        maxWidth: isMobile ? "100%" : 400,
        width: "100%",
        alignSelf: "start",
        mx: isMobile ? 0 : "auto",
        mt: isMobile ? 2 : 12,
        p: isMobile ? 2 : 3,
        borderRadius: 2,
        boxShadow: isMobile ? 0 : 2,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h5" align="center">
        {title}
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        fullWidth
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        fullWidth
      />
      <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
        {submitLabel}
      </Button>
      {children}
    </Box>
  );
};

export default AuthForm;
