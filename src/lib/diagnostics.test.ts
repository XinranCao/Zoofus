import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({ app: {}, useEmulators: true }));
import { codeOf, getLog, logAsText, record } from "./diagnostics";

describe("diagnostics log", () => {
  beforeEach(() => getLog().length && (getLog() as unknown[]).splice(0));

  it("keeps entries in order and writes them as text with their code", () => {
    record("error", "upload failed", "storage/unauthorized");
    record("appcheck", "token ready");
    const text = logAsText();
    expect(text).toContain("[error] (storage/unauthorized) upload failed");
    expect(text.indexOf("upload failed")).toBeLessThan(text.indexOf("token ready"));
  });

  it("keeps only the latest entries", () => {
    for (let i = 0; i < 200; i++) record("info", `n${i}`);
    expect(getLog().length).toBe(80);
    expect(getLog().at(-1)!.message).toBe("n199");
  });
});

describe("codeOf", () => {
  it("reads a code from an error, its message, or a list", () => {
    expect(
      codeOf(Object.assign(new Error("x"), { code: "storage/retry-limit-exceeded" })),
    ).toBe("storage/retry-limit-exceeded");
    expect(codeOf(new Error("Firebase Storage: denied (storage/unauthorized)."))).toBe(
      "storage/unauthorized",
    );
    expect(
      codeOf("FirebaseError: Missing or insufficient permissions. permission-denied"),
    ).toBe("permission-denied");
    expect(codeOf(["Sharing failed", new Error("Timed out (timeout/upload)")])).toBe(
      "timeout/upload",
    );
    expect(codeOf("nothing to see")).toBeUndefined();
  });
});
