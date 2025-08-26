import { useState } from "react";
import PageContainer from "../../components/PageContainer";
import ImageLassoPanel from "../../components/ImageLasso/ImageLassoPanel";
import { Button, Dialog, DialogTitle, DialogContent, Box } from "@mui/material";
import styles from "./Home.module.less";

const HomePage = () => {
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
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Image Lasso Selection</DialogTitle>
          <DialogContent>
            <ImageLassoPanel onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  );
};

export default HomePage;
