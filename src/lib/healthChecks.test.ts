import { describe, expect, it, vi } from "vitest";

vi.mock("./firebase", () => ({
  appCheck: null,
  auth: { currentUser: null },
  db: {},
  storage: {},
  useEmulators: true,
}));
vi.mock("./env", () => ({ env: { VITE_APP_APP_ID: "1:1:web:abc" } }));
import { readToken } from "./healthChecks";

const jwt = (payload: object) =>
  `h.${btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_")}.s`;

describe("readToken", () => {
  it("shows which app a token is for and when it ends", () => {
    const t = readToken(
      jwt({
        sub: "1:1:web:abc",
        aud: ["projects/1", "projects/zoofus"],
        exp: 1_800_000_000,
      }),
    );
    expect(t.app).toBe("1:1:web:abc");
    expect(t.audience).toBe("projects/1, projects/zoofus");
    expect(t.expires).toBe("2027-01-15T08:00:00.000Z");
  });
  it("copes with something that is not a token", () => {
    expect(readToken("nonsense")).toEqual({});
  });
});
