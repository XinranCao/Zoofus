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

const ShapeSelector = React.memo(function ShapeSelector(props) {
  const {
    shapeType,
    setShapeType,
    SHAPES,
    isMobile,
    disabled,
    addShape,
    addLassoSelection,
    imageSrc,
    confirmed,
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
      <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
        {shapeType !== "lasso" && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => addShape(shapeType)}
            disabled={!imageSrc || confirmed}
          >
            Add Shape
          </Button>
        )}
      </Box>
    </Box>
  );
});

export default ShapeSelector;
