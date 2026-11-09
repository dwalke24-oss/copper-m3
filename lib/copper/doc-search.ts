// Module 3: search_docs. Finds the passages of Copper's PDFs whose meaning is
// closest to a question. The question is embedded with the same model as the
// passages (lib/copper/passages.ts), then compared with every passage in
// memory; the closest ones come back with a link to their PDF page.
import { callEmbedMany } from "@/lib/ai/call";
import { DOCUMENTS } from "@/lib/copper/documents";
import { type Passage, PASSAGES } from "@/lib/copper/passages";

/** How many passages a search returns. */
export const SEARCH_RESULTS = 5;

export type DocResult = {
  title: string;
  page: number;
  /** Opens the PDF at this page, e.g. "/docs/copper-plus-faq.pdf#page=5". */
  url: string;
  /** The passage's sentences, without the title line it was embedded with. */
  text: string;
  /** How close in meaning, from 0 (unrelated) to 1 (same). */
  score: number;
};

export type DocSearch = { query: string; results: DocResult[] };

const FILES = new Map(DOCUMENTS.map((d) => [d.id, d.file]));

/** Both vectors have length 1, so their dot product is their cosine similarity. */
function similarity(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** The `count` passages closest to a query vector, closest first. */
export function closestPassages(
  queryVector: number[],
  passages: Passage[] = PASSAGES,
  count = SEARCH_RESULTS,
): { passage: Passage; score: number }[] {
  return passages
    .map((passage) => ({
      passage,
      score: similarity(queryVector, passage.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

export function toResult(passage: Passage, score: number): DocResult {
  const prefix = `${passage.title}\n`;
  return {
    title: passage.title,
    page: passage.page,
    url: `${FILES.get(passage.documentId)}#page=${passage.page}`,
    text: passage.text.startsWith(prefix)
      ? passage.text.slice(prefix.length)
      : passage.text,
    score: Math.round(score * 1000) / 1000,
  };
}

/** search_docs: embeds the question and returns the 5 closest passages. */
export async function searchDocs(query: string): Promise<DocSearch> {
  const [vector] = await callEmbedMany(
    { module: 3, feature: "search-docs" },
    [query],
    "RETRIEVAL_QUERY",
  );
  return {
    query,
    results: closestPassages(vector).map(({ passage, score }) =>
      toResult(passage, score),
    ),
  };
}
