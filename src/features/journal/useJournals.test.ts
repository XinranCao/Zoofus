import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Journal } from "./journal.schema";
import {
  patchJournal,
  patchJournalPages,
  useJournals,
  useSaveJournal,
} from "./useJournals";

const api = vi.hoisted(() => ({
  listJournals: vi.fn(),
  saveJournal: vi.fn(),
}));
vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({ currentUser: { uid: "u1" } }),
}));
vi.mock("./journal.api", () => ({
  listJournals: api.listJournals,
  saveJournal: api.saveJournal,
  createJournal: vi.fn(),
  deleteJournal: vi.fn(),
  getJournal: vi.fn(),
  listJournalPage: vi.fn(),
  loadItems: vi.fn(),
  slimJournal: vi.fn(),
  renameJournal: vi.fn(),
}));

const j = (id: string, title: string): Journal =>
  ({ id, title, items: [], thumbUrl: undefined }) as unknown as Journal;

describe("patchJournal (the cached list after a save or a heal)", () => {
  const list = [j("a", "A"), j("b", "B"), j("c", "C")];

  it("changes one journal and moves it to the front after a save", () => {
    const next = patchJournal(list, "c", { title: "New" }, true)!;
    expect(next.map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(next[0]!.title).toBe("New");
    expect(list[2]!.title).toBe("C"); // the old list is not touched
  });

  it("keeps the order after a heal (the picture does not change the updated time)", () => {
    const next = patchJournal(list, "b", { thumbUrl: "https://x/y.webp" }, false)!;
    expect(next.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(next[1]!.thumbUrl).toBe("https://x/y.webp");
  });

  it("leaves a list that is not loaded, or does not have the journal, alone", () => {
    expect(patchJournal(undefined, "a", {}, true)).toBeUndefined();
    expect(patchJournal(list, "zzz", { title: "x" }, true)).toBe(list);
  });
});

describe("patchJournalPages (the pages of the Journals screen)", () => {
  const data = {
    pageParams: [null, null],
    pages: [
      { journals: [j("a", "A"), j("b", "B")], cursor: null },
      { journals: [j("c", "C")], cursor: null },
    ],
  };

  it("changes the journal in whichever page holds it, and nothing else", () => {
    const next = patchJournalPages(data, "c", { title: "New" })!;
    expect(next.pages[1]!.journals[0]!.title).toBe("New");
    expect(next.pages[0]!.journals.map((x) => x.title)).toEqual(["A", "B"]);
    expect(data.pages[1]!.journals[0]!.title).toBe("C"); // the old pages are not touched
  });

  it("leaves pages that are not loaded alone", () => {
    expect(patchJournalPages(undefined, "a", {})).toBeUndefined();
  });
});

describe("saving a journal", () => {
  it("does not read the whole list again, and the list shows the new title and picture", async () => {
    api.listJournals.mockResolvedValue([j("a", "A"), j("b", "B")]);
    api.saveJournal.mockResolvedValue({ thumbPath: "p", thumbUrl: "https://x/p.webp" });
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, children);
    const list = renderHook(() => useJournals(), { wrapper });
    const save = renderHook(() => useSaveJournal(), { wrapper });
    await waitFor(() => expect(list.result.current.data).toHaveLength(2));
    for (let n = 0; n < 5; n++)
      await act(() =>
        save.result.current.mutateAsync({
          journal: { id: "b", thumbPath: undefined },
          changes: {
            title: "Renamed " + n,
            thumb: new Blob(["x"]),
            items: [
              { ...j("z", "z"), sy: undefined } as unknown as Journal["items"][number],
            ],
          },
        }),
      );
    expect(api.listJournals).toHaveBeenCalledTimes(1);
    expect(list.result.current.data!.map((x) => x.id)).toEqual(["b", "a"]);
    // the list carries only the count; the items are kept for the tile, with nothing undefined
    // (a share writes these items out again)
    expect(list.result.current.data![0]).toMatchObject({
      itemCount: 1,
      slim: true,
      items: [],
    });
    const kept = qc.getQueryData<object[]>(["journalItems", "u1", "b"]);
    expect(kept).toHaveLength(1);
    expect("sy" in kept![0]!).toBe(false);
    await waitFor(() =>
      expect(list.result.current.data![0]).toMatchObject({
        title: "Renamed 4",
        thumbUrl: "https://x/p.webp",
      }),
    );
  });
});
