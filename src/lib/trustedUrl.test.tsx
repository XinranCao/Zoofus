import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Avatar } from "@/components/ui/Avatar";
import {
  assertTrustedPictureUrl,
  isTrustedPictureUrl,
  pictureUrlSchema,
  safeDisplayUrl,
  safePictureUrl,
} from "./trustedUrl";

const BUCKET = "zoofus-48264.firebasestorage.app";

// a machine whose .env.local turns the emulator flag on must not change what these tests mean
beforeEach(() => vi.stubEnv("VITE_USE_EMULATORS", ""));
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

  it("accepts the project's bucket under either of its names", () => {
    vi.stubEnv("VITE_APP_STORAGE_BUCKET", BUCKET);
    for (const name of ["zoofus-48264.firebasestorage.app", "zoofus-48264.appspot.com"])
      expect(
        isTrustedPictureUrl(
          `https://firebasestorage.googleapis.com/v0/b/${name}/o/a?alt=media`,
        ),
      ).toBe(true);
    expect(
      isTrustedPictureUrl(
        "https://firebasestorage.googleapis.com/v0/b/other.appspot.com/o/a",
      ),
    ).toBe(false);
  });
});

describe("what is shown from data a friend can write", () => {
  const EVIL = "https://evil.example/pixel.png";

  it("turns an untrusted link into nothing (schema) and keeps data images", () => {
    vi.stubEnv("VITE_APP_STORAGE_BUCKET", BUCKET);
    expect(safePictureUrl(EVIL)).toBe("");
    expect(safePictureUrl(undefined)).toBe("");
    expect(pictureUrlSchema.parse(EVIL)).toBe("");
    expect(pictureUrlSchema.parse("data:image/webp;base64,AAAA")).toBe(
      "data:image/webp;base64,AAAA",
    );
  });

  it("lets the page's own blob: links through for display, but not for friend data", () => {
    expect(safeDisplayUrl("blob:http://localhost/abc")).toBe("blob:http://localhost/abc");
    expect(safePictureUrl("blob:http://localhost/abc")).toBe("");
  });

  it("an avatar never puts an outside picture in the page", () => {
    vi.stubEnv("VITE_APP_STORAGE_BUCKET", BUCKET);
    const { container } = render(<Avatar name="Mei" src={EVIL} asStatic />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("M");
    const sticker = render(<Avatar name="Mei" src={EVIL} kind="sticker" asStatic />);
    expect(
      sticker.container.querySelector("img")?.getAttribute("src") ?? "",
    ).not.toContain("evil");
  });
});
