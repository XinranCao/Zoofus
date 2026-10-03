import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { Alert, Button, CircularProgress, type ButtonProps } from "@mui/material";
import { useRef, useState } from "react";
import { prepareImage, UnsupportedImageError } from "@/lib/image";
import { useEditor } from "../store/editorStore";

/** Button + hidden file input. The editor revokes the object URL when the image changes. */
export function ImagePicker({ children, ...props }: Omit<ButtonProps, "onClick">) {
  const setImage = useEditor((s) => s.setImage);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        startIcon={busy ? <CircularProgress size={18} /> : <PhotoCameraIcon />}
        disabled={busy}
        {...props}
        onClick={() => {
          if (input.current) input.current.value = "";
          input.current?.click();
        }}
      >
        {children}
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError(null);
          try {
            setImage(await prepareImage(file));
          } catch (err) {
            setError(
              err instanceof UnsupportedImageError
                ? err.message
                : "Could not open that image.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      {error && <Alert severity="error">{error}</Alert>}
    </>
  );
}
