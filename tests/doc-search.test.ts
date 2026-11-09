// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { PASSAGES } from "@/lib/copper/passages";

// A search embeds the question; here that returns a chosen passage's own
// vector, so that passage must come back first. No AI key needed.
const target = PASSAGES.find(
  (p) => p.documentId === "copper-plus-faq" && p.page > 1,
)!;
vi.mock("@/lib/ai/call", () => ({
  callEmbedMany: vi.fn(async () => [target.embedding]),
}));

const { closestPassages, searchDocs, toResult, SEARCH_RESULTS } =
  await import("@/lib/copper/doc-search");
const { copperTools, searchDocsInput } =
  await import("@/lib/copper/assistant/tools");
const { TOOL_LABELS } = await import("@/lib/copper/assistant/progress");
const { COPPER_INSTRUCTIONS } =
  await import("@/lib/copper/assistant/instructions");
const { callEmbedMany } = await import("@/lib/ai/call");

describe("search_docs", () => {
  it("ranks passages by closeness, closest first", () => {
    const top = closestPassages(target.embedding);
    expect(top).toHaveLength(SEARCH_RESULTS);
    expect(top[0].passage.id).toBe(target.id);
    expect(top[0].score).toBeCloseTo(1, 3);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].score).toBeGreaterThanOrEqual(top[i].score);
    }
  });

  it("returns title, page, a link to that PDF page, and the text without the title line", () => {
    const result = toResult(target, 0.81234);
    expect(result).toEqual({
      title: "Copper Plus FAQ",
      page: target.page,
      url: `/docs/copper-plus-faq.pdf#page=${target.page}`,
      text: target.text.slice("Copper Plus FAQ\n".length),
      score: 0.812,
    });
  });

  it("embeds the question as a query, logged as module 3", async () => {
    const search = await searchDocs("annual refund");
    expect(callEmbedMany).toHaveBeenCalledWith(
      { module: 3, feature: "search-docs" },
      ["annual refund"],
      "RETRIEVAL_QUERY",
    );
    expect(search.query).toBe("annual refund");
    expect(search.results).toHaveLength(5);
    expect(search.results[0].url).toMatch(/^\/docs\/.+\.pdf#page=\d+$/);
  });

  it("is one of Copper's tools, with a label, and the instructions send help questions to it", async () => {
    expect(Object.keys(copperTools)).toContain("search_docs");
    expect(TOOL_LABELS.search_docs).toBeTruthy();
    expect(typeof copperTools.search_docs.execute).toBe("function");
    expect(searchDocsInput.safeParse({ query: "reset Wi-Fi" }).success).toBe(
      true,
    );
    expect(searchDocsInput.safeParse({ query: "" }).success).toBe(false);
    expect(COPPER_INSTRUCTIONS).toMatch(/search_docs/);
    expect(COPPER_INSTRUCTIONS).toMatch(/troubleshooting/);
    expect(COPPER_INSTRUCTIONS).toMatch(/warranty/);
  });
});
