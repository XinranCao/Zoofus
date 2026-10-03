import React from "react";
import {
  Box,
  Select,
  MenuItem,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const ShapeSelector = React.memo(function ShapeSelector(props) {
  const {
    shapeType,
    setShapeType,
    SHAPES,
    isMobile,
    disabled,
    addShape,
    imageSrc,
    confirmed,
    activeShapeId,
    handleDeleteActive,
  } = props;
  if (disabled) return null;

  return (
    <Box sx={{ mb: 2 }}>
      {isMobile ? (
        <Select
          value={shapeType}
          onChange={(e) => setShapeType(e.target.value)}
          size="small"
          sx={{
            mb: 2,
            background: "#ffffff",
            borderRadius: 2,
          }}
        >
          {SHAPES.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {s.icon}
                <Typography variant="caption" sx={{ ml: 1 }}>
                  {s.label}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      ) : (
        <ToggleButtonGroup
          value={shapeType}
          exclusive
          onChange={(_, val) => {
            if (typeof val === "string") setShapeType(val);
          }}
          sx={{
            mb: 2,
            background: "#ffffff",
            borderRadius: 2,
          }}
        >
          {SHAPES.map((s) => (
            <ToggleButton key={s.value} value={s.value} size="small">
              {s.icon}
              <Typography variant="caption" sx={{ ml: 1 }}>
                {s.label}
              </Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => addShape(shapeType)}
          disabled={!imageSrc || confirmed || shapeType === "lasso"}
        >
          Add Shape
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          onClick={handleDeleteActive}
          disabled={!activeShapeId}
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
});

export default ShapeSelector;
