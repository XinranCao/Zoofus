import { Box, Button, Typography } from "@mui/material";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <Box sx={{ p: 4, textAlign: "center" }}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        Page not found
      </Typography>
      <Button component={Link} to="/" variant="contained">
        Back to home
      </Button>
    </Box>
  );
}
