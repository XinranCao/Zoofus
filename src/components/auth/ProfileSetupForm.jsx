import {
  Box,
  TextField,
  Button,
  Avatar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useState } from "react";

const ProfileSetupForm = ({ onSubmit, loading }) => {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, photo });
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
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
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        fullWidth
      />
      <Button variant="outlined" component="label">
        Upload Profile Picture
        <input
          type="file"
          accept="image/*"
          hidden
          onChange={handlePhotoChange}
        />
      </Button>
      {photo && (
        <Avatar
          src={URL.createObjectURL(photo)}
          sx={{ width: 56, height: 56, mx: "auto" }}
        />
      )}
      <Button type="submit" variant="contained" disabled={loading}>
        Finish Signup
      </Button>
    </Box>
  );
};

export default ProfileSetupForm;
