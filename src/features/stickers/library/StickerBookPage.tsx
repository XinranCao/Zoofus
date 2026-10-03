import DeleteIcon from "@mui/icons-material/Delete";
import {
  Alert,
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { PageContainer } from "@/components/layout/PageContainer";
import { useDeleteSticker, useStickers } from "./useStickers";

export default function StickerBookPage() {
  const { data: stickers, isPending, error } = useStickers();
  const remove = useDeleteSticker();

  return (
    <PageContainer>
      <Box sx={{ p: 3, overflow: "auto", height: "100%", boxSizing: "border-box" }}>
        <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
          My Stickers
        </Typography>
        {isPending && <CircularProgress />}
        {error && <Alert severity="error">Could not load your stickers.</Alert>}
        {remove.error && <Alert severity="error">Could not delete that sticker.</Alert>}
        {stickers?.length === 0 && (
          <Typography color="text.secondary">
            No stickers yet. Cut one out on the home page and save it here.
          </Typography>
        )}
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          }}
        >
          {stickers?.map((sticker) => (
            <Card key={sticker.id}>
              <CardMedia
                component="img"
                image={sticker.imageUrl}
                alt={sticker.name}
                sx={{ height: 160, objectFit: "contain", bgcolor: "action.hover" }}
              />
              <CardContent>
                <Typography noWrap>{sticker.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {sticker.createdAt.toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton
                  aria-label={`Delete ${sticker.name}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(sticker)}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </Box>
      </Box>
    </PageContainer>
  );
}
