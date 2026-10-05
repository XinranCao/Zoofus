import { afterEach, describe, expect, it, vi } from "vitest";
import { assertTrustedPictureUrl, isTrustedPictureUrl } from "./trustedUrl";

const BUCKET = "zoofus-48264.firebasestorage.app";

afterEach(() => vi.unstubAllEnvs());

describe("isTrustedPictureUrl", () => {
  it("allows data images and this project's bucket", () => {
    vi.stubEnv("VITE_APP_STORAGE_BUCKET", BUCKET);
    expect(isTrustedPictureUrl("data:image/webp;base64,AAAA")).toBe(true);
    expect(
      isTrustedPictureUrl(
        `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/u%2Fa.png?alt=media&token=t`,
      ),
    ).toBe(true);
  });

  it("refuses other hosts, other buckets, http, javascript and file links", () => {
    vi.stubEnv("VITE_APP_STORAGE_BUCKET", BUCKET);
    for (const bad of [
      "https://evil.example/a.png",
      "http://firebasestorage.googleapis.com/v0/b/" + BUCKET + "/o/a.png",
      "https://firebasestorage.googleapis.com/v0/b/other-bucket/o/a.png",
      "https://firebasestorage.googleapis.com.evil.example/v0/b/" + BUCKET + "/o/a",
      "javascript:alert(1)",
      "file:///etc/passwd",
      "data:text/html,<script>1</script>",
      "http://169.254.169.254/latest/meta-data",
      "not a url",
      "",
    ])
      expect(isTrustedPictureUrl(bad), bad).toBe(false);
  });

  it("allows the emulator's Storage only when emulators are on", () => {
    vi.stubEnv("VITE_APP_STORAGE_BUCKET", BUCKET);
    const link = "http://192.168.1.5:9199/v0/b/demo-zoofus.appspot.com/o/a.png?alt=media";
    expect(isTrustedPictureUrl(link)).toBe(false);
    vi.stubEnv("VITE_USE_EMULATORS", "true");
    expect(isTrustedPictureUrl(link)).toBe(true);
    expect(isTrustedPictureUrl("http://192.168.1.5:8080/v0/b/x/o/a")).toBe(false);
  });

  it("throws a coded error", () => {
    expect(() => assertTrustedPictureUrl("https://evil.example/a.png")).toThrow(
      /not allowed/,
    );
  });
});
