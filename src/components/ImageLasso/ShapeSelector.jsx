import {
  Box,
  Select,
  MenuItem,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

const ShapeSelector = ({
  shapeType,
  setShapeType,
  SHAPES,
  isMobile,
  disabled,
}) => {
  if (disabled) return null;

  return isMobile ? (
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
      onChange={(_, val) => val && setShapeType(val)}
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
  );
};

export default ShapeSelector;
