import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { lazy, Suspense, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import styles from "./HomePage.module.less";

const StickerEditor = lazy(() =>
  import("@/features/stickers/editor/StickerEditor").then((m) => ({
    default: m.StickerEditor,
  })),
);

export default function HomePage() {
  const [open, setOpen] = useState(false);

  return (
    <PageContainer>
      <div className={styles.homePageContainer}>
        <Box textAlign="center">
          <h1>Welcome to Zoofus!</h1>
          <Button
            variant="contained"
            size="large"
            sx={{ mt: 5, px: 4, py: 2, fontSize: "1.2rem", borderRadius: 2 }}
            onClick={() => setOpen(true)}
          >
            Start Image Lasso Selection
          </Button>
        </Box>
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Image Lasso Selection</DialogTitle>
          <DialogContent>
            <Suspense fallback={<CircularProgress />}>
              {/* Unmounting on close resets the editor state */}
              {open && <StickerEditor />}
            </Suspense>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </div>
    </PageContainer>
  );
}
