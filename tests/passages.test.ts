// @vitest-environment node
import { describe, expect, it } from "vitest";
import { EMBEDDING_MODEL } from "@/lib/ai/models";
import { DOCUMENTS } from "@/lib/copper/documents";
import { cleanPage, passageText, splitPage } from "@/lib/copper/passage-split";
import { PASSAGE_MODEL, PASSAGES } from "@/lib/copper/passages";

const PAGE = [
  "Copper Home User Guide Set up Copper Home",
  "CSL-UG-0101-EN Rev. C 3",
  "© 2026 Copper State Labs, Inc. · Fictional company and documents.",
  "2.2 Setup steps",
  "1 Plug in Copper Home. After a few seconds the light ring flashes blue: it's in",
  "setup mode.",
  "2 Open the Copper app and tap Add Device.",
  "3 Choose Copper Home and follow the prompts.",
  "4 Pick your Wi-Fi network and enter the password.",
  "5 Name the room Copper Home is in, for example Kitchen.",
  "2.3 Updates",
  "Copper Home updates itself overnight when it's connected to Wi-Fi. To check your",
  "version, open the Copper app and go to Devices > Copper Home > About.",
].join("\n");

describe("splitting a page into passages", () => {
  it("drops the running header and rejoins wrapped lines", () => {
    const lines = cleanPage(PAGE);
    expect(lines[0]).toBe("2.2 Setup steps");
    expect(lines.join("\n")).not.toMatch(/CSL-UG|©/);
    expect(lines).toContain(
      "1 Plug in Copper Home. After a few seconds the light ring flashes blue: it's in setup mode.",
    );
  });

  it("makes passages of a few sentences and keeps headings with what follows", () => {
    const passages = splitPage(PAGE);
    expect(passages.length).toBeGreaterThan(1);
    for (const p of passages) expect(p.length).toBeLessThanOrEqual(700);
    expect(passages[0].startsWith("2.2 Setup steps 1 Plug in")).toBe(true);
    expect(
      passages.some((p) => p.includes("2.3 Updates Copper Home updates")),
    ).toBe(true);
    expect(passages.some((p) => p.endsWith("2.3 Updates"))).toBe(false);
  });

  it("starts each passage's text with the document title", () => {
    expect(passageText("Copper Plus FAQ", "Hello.")).toBe(
      "Copper Plus FAQ\nHello.",
    );
  });
});

describe("the saved passages", () => {
  it("cover every document, with valid page numbers", () => {
    for (const doc of DOCUMENTS) {
      const mine = PASSAGES.filter((p) => p.documentId === doc.id);
      expect(mine.length, doc.id).toBeGreaterThan(0);
      for (const p of mine) {
        expect(p.title).toBe(doc.title);
        expect(p.text.startsWith(`${doc.title}\n`)).toBe(true);
        expect(p.page).toBeGreaterThanOrEqual(1);
      }
    }
    expect(new Set(PASSAGES.map((p) => p.id)).size).toBe(PASSAGES.length);
  });

  it("were embedded with the current embedding model at unit length", () => {
    expect(PASSAGE_MODEL).toEqual({
      id: EMBEDDING_MODEL.id,
      dimensions: EMBEDDING_MODEL.dimensions,
    });
    for (const p of PASSAGES) {
      expect(p.embedding).toHaveLength(EMBEDDING_MODEL.dimensions);
      expect(Math.hypot(...p.embedding)).toBeCloseTo(1, 3);
    }
  });
});
