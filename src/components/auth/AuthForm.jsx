import { Box, TextField, Button, Typography } from "@mui/material";

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
}) => (
  <Box
    component="form"
    onSubmit={onSubmit}
    sx={{
      display: "flex",
      flexDirection: "column",
      gap: 2,
      maxWidth: 400,
      mx: "auto",
      mt: 4,
      p: 3,
      borderRadius: 2,
      boxShadow: 2,
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
    <Button type="submit" variant="contained" fullWidth>
      {submitLabel}
    </Button>
    {children}
  </Box>
);

export default AuthForm;
