import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
  Alert,
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { PageContainer } from "@/components/layout/PageContainer";
import { useState } from "react";
import { MAX_STICKER_NAME, type Sticker } from "./sticker.schema";
import { useDeleteSticker, useRenameSticker, useStickers } from "./useStickers";

export default function StickerBookPage() {
  const { data: stickers, isPending, error } = useStickers();
  const remove = useDeleteSticker();
  const rename = useRenameSticker();
  const [renaming, setRenaming] = useState<Sticker | null>(null);
  const [draft, setDraft] = useState("");

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
                image={sticker.thumbnailUrl ?? sticker.imageUrl}
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
                  aria-label={`Rename ${sticker.name}`}
                  onClick={() => {
                    setRenaming(sticker);
                    setDraft(sticker.name);
                  }}
                >
                  <EditIcon />
                </IconButton>
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
        <Dialog
          open={renaming !== null}
          onClose={() => setRenaming(null)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Rename sticker</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="dense"
              label="Name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              slotProps={{ htmlInput: { maxLength: MAX_STICKER_NAME } }}
            />
            {rename.isError && <Alert severity="error">Could not rename.</Alert>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenaming(null)}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!draft.trim() || rename.isPending}
              onClick={() =>
                renaming &&
                rename.mutate(
                  { id: renaming.id, name: draft.trim() },
                  { onSuccess: () => setRenaming(null) },
                )
              }
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
}
