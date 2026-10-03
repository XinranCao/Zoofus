import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SOURCE_BYTES, prepareImage, UnsupportedImageError } from "./image";

const drawImage = vi.fn();
const close = vi.fn();
let encodedType = "";

beforeEach(() => {
  drawImage.mockClear();
  close.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb, type) => {
    encodedType = type ?? "";
    cb(new Blob(["x"], { type }));
  });
  URL.createObjectURL = vi.fn(() => "blob:prepared");
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const file = (type: string, size = 100) => {
  const f = new File(["x"], "photo", { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("prepareImage", () => {
  it("rejects files that are not images", async () => {
    await expect(prepareImage(file("application/pdf"))).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
  });

  it("rejects files over the size limit", async () => {
    await expect(prepareImage(file("image/jpeg", MAX_SOURCE_BYTES + 1))).rejects.toThrow(
      /30 MB/,
    );
  });

  it("explains when the browser cannot decode the format", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("decode")));
    await expect(prepareImage(file("image/heic"))).rejects.toThrow(/JPEG or PNG/);
  });

  it("honours EXIF orientation when decoding", async () => {
    await prepareImage(file("image/jpeg"));
    expect(createImageBitmap).toHaveBeenCalledWith(expect.anything(), {
      imageOrientation: "from-image",
    });
  });

  it("downscales large photos to the editor limit and encodes JPEG", async () => {
    const url = await prepareImage(file("image/jpeg"), 2000);
    expect(url).toBe("blob:prepared");
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2000, 1500);
    expect(encodedType).toBe("image/jpeg");
  });

  it("keeps PNG for formats that can have transparency", async () => {
    await prepareImage(file("image/png"));
    expect(encodedType).toBe("image/png");
  });

  it("releases the decoded bitmap", async () => {
    await prepareImage(file("image/png"));
    expect(close).toHaveBeenCalled();
  });
});
