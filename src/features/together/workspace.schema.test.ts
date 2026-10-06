import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE } from "@/features/journal/journal.schema";
import { workspaceDocSchema } from "./workspace.schema";

// A document that was just written locally still has no server time (Firestore hands the page a
// null for it until the server answers). That must read as a page, not as "this page isn't here".
describe("a workspace document that was just written", () => {
  it("is read even before the server has stamped its times", () => {
    const r = workspaceDocSchema.safeParse({
      title: "Trip",
      ownerUid: "a",
      members: ["a"],
      invited: [],
      page: DEFAULT_PAGE,
      createdAt: null,
      updatedAt: null,
    });
    expect(r.success).toBe(true);
  });
});
