import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMPRESSION, encodeWithin, type CompressOptions } from "./image";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
});
afterEach(() => vi.restoreAllMocks());

const source = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/** A fake encoder: size grows with pixels and quality, like a real lossy encoder. */
const lossy = (bytesPerPixelAtQ1: number) =>
  vi.fn(async (canvas: HTMLCanvasElement, type: string, quality: number) => {
    const blob = new Blob(["x"], { type });
    Object.defineProperty(blob, "size", {
      value: Math.round(canvas.width * canvas.height * bytesPerPixelAtQ1 * quality),
    });
    return blob;
  });

const opts: CompressOptions = { ...COMPRESSION.sticker };

describe("encodeWithin", () => {
  it("scales a huge image down to the max side and keeps the aspect ratio", async () => {
    const out = await encodeWithin(source(4000, 3000), opts, lossy(0.01));
    expect(out.width).toBe(1280);
    expect(out.height).toBe(960);
  });

  it("never upscales a small image", async () => {
    const out = await encodeWithin(source(300, 200), opts, lossy(0.01));
    expect([out.width, out.height]).toEqual([300, 200]);
  });

  it("encodes once at the starting quality when it already fits", async () => {
    const encode = lossy(0.01);
    await encodeWithin(source(1000, 1000), opts, encode);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode).toHaveBeenCalledWith(expect.anything(), "image/webp", 0.82);
  });

  it("lowers quality first, in steps, but not below the floor", async () => {
    const encode = lossy(0.8); // 1280x960 * 0.8 * q is far over 400 KB at every quality
    await encodeWithin(source(1280, 960), opts, encode);
    const qualities = encode.mock.calls.map((c) => c[2]);
    expect(qualities.slice(0, 4)).toEqual([0.82, 0.72, 0.62, 0.6]);
    expect(Math.min(...qualities)).toBe(0.6);
  });

  it("then shrinks the dimensions, stopping at the minimum side", async () => {
    const encode = lossy(100); // impossible to satisfy
    const out = await encodeWithin(source(2000, 2000), opts, encode);
    expect(out.width).toBeGreaterThanOrEqual(opts.minSide);
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(opts.minSide + 1);
  });

  it("returns as soon as the result fits", async () => {
    // fits only after quality drops to 0.72: 1280*960*0.4*0.82 > 400 KB > 1280*960*0.4*0.72? no
    const encode = vi.fn(async (_c: HTMLCanvasElement, type: string, q: number) => {
      const blob = new Blob(["x"], { type });
      Object.defineProperty(blob, "size", { value: q > 0.75 ? 500_000 : 300_000 });
      return blob;
    });
    const out = await encodeWithin(source(1280, 960), opts, encode);
    expect(out.blob.size).toBe(300_000);
    expect(out.width).toBe(1280);
    expect(encode).toHaveBeenCalledTimes(2);
  });

  it("falls back to shrinking dimensions when the browser returns PNG instead of WebP", async () => {
    const encode = vi.fn(async (canvas: HTMLCanvasElement) => {
      const blob = new Blob(["x"], { type: "image/png" }); // browser ignored the requested type
      Object.defineProperty(blob, "size", { value: canvas.width * canvas.height });
      return blob;
    });
    const out = await encodeWithin(source(1280, 960), opts, encode);
    expect(out.blob.type).toBe("image/png");
    expect(out.blob.size).toBeLessThanOrEqual(opts.maxBytes);
    // quality was never lowered: PNG has no quality setting
    expect(new Set(encode.mock.calls.map((c) => (c as unknown[])[2])).size).toBe(1);
  });

  it("flattens transparency for JPEG output", async () => {
    const fillRect = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
      fillRect,
    } as unknown as CanvasRenderingContext2D);
    await encodeWithin(source(300, 300), { ...COMPRESSION.avatar }, lossy(0.01));
    expect(fillRect).toHaveBeenCalled();
  });

  it("uses the policy limits: 1280 px stickers, 256 px thumbnails, 512 px avatars", () => {
    expect(COMPRESSION.sticker.maxSide).toBe(1280);
    expect(COMPRESSION.thumbnail.maxSide).toBe(256);
    expect(COMPRESSION.avatar.maxSide).toBe(512);
  });
});
