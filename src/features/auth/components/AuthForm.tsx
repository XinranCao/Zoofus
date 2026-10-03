import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Button, TextField, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { credentialsSchema, type Credentials } from "../auth.schema";

interface Props {
  title: string;
  submitLabel: string;
  error?: string;
  onSubmit: (values: Credentials) => Promise<void> | void;
  children?: ReactNode;
}

export function AuthForm({ title, submitLabel, error, onSubmit, children }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema) });

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
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
        autoComplete="email"
        fullWidth
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        fullWidth
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
        {...register("password")}
      />
      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isSubmitting}
        sx={{ mt: 2 }}
      >
        {submitLabel}
      </Button>
      {children}
    </Box>
  );
}
