import { Box, Stack } from "@mui/material";

import LassoControls from "./LassoControls";
import PreviewBox from "./PreviewBox";
import { useImageLassoState } from "./hooks/useImageLassoState.jsx";
import { ImageLassoContext } from "./ImageLassoContext";

import styles from "./ImageLassoPanel.module.less";

const ImageLassoPanel = ({ onClose }) => {
  const contextValue = useImageLassoState(onClose, styles);

  return (
    <ImageLassoContext.Provider value={contextValue}>
      <Box>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={4}
          alignItems="center"
        >
          <Box>
            <PreviewBox />
          </Box>
          <Box sx={{ flex: 1, minWidth: 280 }}>
            <LassoControls />
          </Box>
        </Stack>
      </Box>
    </ImageLassoContext.Provider>
  );
};

export default ImageLassoPanel;
