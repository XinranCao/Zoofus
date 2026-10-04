import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({ env: { VITE_USE_EMULATORS: "true" } }));
import { localizeUrl, localizeUrls } from "./emulatorUrl";

describe("emulator links", () => {
  afterEach(() => vi.unstubAllGlobals());
  const at = (hostname: string) => vi.stubGlobal("window", { location: { hostname } });

  it("point at the host the page was loaded from", () => {
    at("192.168.1.20");
    expect(localizeUrl("http://localhost:9199/v0/b/x/o/a.webp?alt=media&token=t")).toBe(
      "http://192.168.1.20:9199/v0/b/x/o/a.webp?alt=media&token=t",
    );
    expect(localizeUrl("http://127.0.0.1:9199/v0/b/x")).toBe(
      "http://192.168.1.20:9199/v0/b/x",
    );
  });

  it("leave real links and other text alone", () => {
    at("192.168.1.20");
    const real = "https://firebasestorage.googleapis.com/v0/b/x/o/a.webp?alt=media";
    expect(localizeUrl(real)).toBe(real);
    expect(localizeUrl("hello")).toBe("hello");
  });

  it("are fixed everywhere inside a share's payload", () => {
    at("10.0.0.5");
    const out = localizeUrls({
      imageUrl: "http://localhost:9199/a",
      n: 3,
      assets: { p0: { url: "http://localhost:9199/b", w: 4 } },
      list: ["http://127.0.0.1:9199/c"],
    });
    expect(out).toEqual({
      imageUrl: "http://10.0.0.5:9199/a",
      n: 3,
      assets: { p0: { url: "http://10.0.0.5:9199/b", w: 4 } },
      list: ["http://10.0.0.5:9199/c"],
    });
  });
});
