import { describe, expect, it } from "vitest";
import { COPPER_INSTRUCTIONS } from "@/lib/copper/assistant/instructions";
import { documentFor, splitCitations } from "@/lib/copper/citations";

describe("citations in Copper's replies", () => {
  it("links each [Title, p. N] to that page of the PDF", () => {
    const parts = splitCitations(
      "Unplug it for 30 seconds [Copper Home User Guide, p. 9]. Annual plans get a full refund within 14 days [Copper Plus FAQ, p. 5].",
    );
    expect(parts).toEqual([
      { type: "text", text: "Unplug it for 30 seconds " },
      {
        type: "citation",
        text: "[Copper Home User Guide, p. 9]",
        title: "Copper Home User Guide",
        page: 9,
        url: "/docs/copper-home-user-guide.pdf#page=9",
      },
      {
        type: "text",
        text: ". Annual plans get a full refund within 14 days ",
      },
      expect.objectContaining({
        url: "/docs/copper-plus-faq.pdf#page=5",
      }),
      { type: "text", text: "." },
    ]);
  });

  it("keeps the reply's text exactly as written", () => {
    const reply =
      "See [Terms and Conditions, p. 4] and [Copper Notes User Guide, page 3]. [Not a doc, p. 2]";
    expect(
      splitCitations(reply)
        .map((p) => p.text)
        .join(""),
    ).toBe(reply);
  });

  it("matches a shortened title, but leaves unknown documents as plain text", () => {
    expect(documentFor("Terms and Conditions")?.id).toBe(
      "copper-terms-and-conditions",
    );
    expect(documentFor("copper plus faq")?.id).toBe("copper-plus-faq");
    expect(splitCitations("Hi [Some Blog, p. 2]")).toEqual([
      { type: "text", text: "Hi [Some Blog, p. 2]" },
    ]);
  });

  it("tells Copper to cite every sentence, use the fallback line and never guess", () => {
    expect(COPPER_INSTRUCTIONS).toContain("[Copper Home User Guide, p. 9]");
    expect(COPPER_INSTRUCTIONS).toContain(
      "I couldn't find that in our support docs.",
    );
    expect(COPPER_INSTRUCTIONS).toMatch(/every sentence/);
    expect(COPPER_INSTRUCTIONS).toMatch(/never guess/i);
    expect(COPPER_INSTRUCTIONS).toMatch(/Copper Crew/);
    // "Can Copper Home order me a pizza?" is a question about the device, so
    // it must search the docs rather than be turned away as off-topic.
    expect(COPPER_INSTRUCTIONS).toMatch(/can or can't do/);
  });
});
