import { describe, expect, it } from "vitest";
import { dataUrlToBlob } from "./dataUrl";

// jsdom's Blob has no arrayBuffer()/text()
const read = (blob: Blob) =>
  new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });

describe("dataUrlToBlob", () => {
  it("decodes a base64 image without fetch", async () => {
    const blob = dataUrlToBlob("data:image/png;base64,AQID");
    expect(blob.type).toBe("image/png");
    expect(new Uint8Array(await read(blob))).toEqual(new Uint8Array([1, 2, 3]));
  });
  it("decodes a percent-encoded one", async () => {
    const blob = dataUrlToBlob("data:text/plain,a%20b");
    expect(new TextDecoder().decode(await read(blob))).toBe("a b");
  });
  it("refuses anything else", () => {
    expect(() => dataUrlToBlob("https://x.test/a.png")).toThrow();
  });
});
