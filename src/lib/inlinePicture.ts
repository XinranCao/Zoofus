import { COMPRESSION, encodeWithin } from "./image";
import { dataUrlToBlob } from "./dataUrl";
import { assertTrustedPictureUrl } from "./trustedUrl";

/** A picture small enough to keep inside a database document, as a `data:` URL. */
export interface InlinePicture {
  url: string;
  width: number;
  height: number;
}

const readAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Could not read the picture"));
    reader.readAsDataURL(blob);
  });

/**
 * Shrink a picture (a blob, or the address of one) to at most `maxSide` pixels and `maxChars`
 * characters of `data:` URL. Friends see pictures kept this way without any permission on the
 * owner's files, and they cost no Storage space or download link: the picture lives in the
 * document that uses it.
 */
export async function toInlinePicture(
  source: Blob | string,
  { maxSide, maxChars }: { maxSide: number; maxChars: number },
): Promise<InlinePicture> {
  let blob: Blob;
  if (typeof source === "string") {
    assertTrustedPictureUrl(source);
    if (/^data:/i.test(source)) blob = dataUrlToBlob(source);
    else {
      const res = await fetch(source);
      if (!res.ok) throw new Error(`Could not read a picture (${res.status})`);
      blob = await res.blob();
    }
  } else blob = source;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  const encoded = await encodeWithin(canvas, {
    ...COMPRESSION.sticker,
    maxSide,
    quality: 0.82,
    minQuality: 0.4,
    minSide: 48,
    // base64 is 4 characters for every 3 bytes, plus the short `data:image/webp;base64,` prefix
    maxBytes: Math.floor((maxChars - 30) * 0.75),
  });
  return {
    url: await readAsDataUrl(encoded.blob),
    width: encoded.width,
    height: encoded.height,
  };
}
