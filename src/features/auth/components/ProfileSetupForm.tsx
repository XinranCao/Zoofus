import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, Box, Button, TextField, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { profileFormSchema, type ProfileForm } from "../auth.schema";

interface Props {
  loading: boolean;
  onSubmit: (values: { name: string; photo: File | null }) => Promise<void> | void;
}

export function ProfileSetupForm({ loading, onSubmit }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [photo, setPhoto] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileFormSchema) });

  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit(({ name }) => onSubmit({ name, photo }))}
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
      <Typography variant="h6" align="center">
        Set Up Your Profile
      </Typography>
      <TextField
        label="Preferred Name"
        fullWidth
        error={Boolean(errors.name)}
        helperText={errors.name?.message}
        {...register("name")}
      />
      <Button variant="outlined" component="label">
        Upload Profile Picture
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </Button>
      {preview && <Avatar src={preview} sx={{ width: 56, height: 56, mx: "auto" }} />}
      <Button type="submit" variant="contained" disabled={loading}>
        Finish Signup
      </Button>
    </Box>
  );
}
