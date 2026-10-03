import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { Button, type ButtonProps } from "@mui/material";
import { useRef } from "react";
import { useEditor } from "../store/editorStore";

/** Button + hidden file input. The editor revokes the object URL when the image changes. */
export function ImagePicker({ children, ...props }: Omit<ButtonProps, "onClick">) {
  const setImage = useEditor((s) => s.setImage);
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        startIcon={<PhotoCameraIcon />}
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
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setImage(URL.createObjectURL(file));
        }}
      />
    </>
  );
}
