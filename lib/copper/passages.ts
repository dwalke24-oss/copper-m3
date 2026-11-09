// The passages of Copper State Labs' PDFs, each with its embedding. Built by
// `npm run passages:build` into data/passages.json and loaded into memory once
// when the server starts (see instrumentation.ts), so searching them needs no
// database: just compare a question's embedding with every passage's.
import data from "./data/passages.json";

export type Passage = {
  /** e.g. "copper-home-user-guide-p3-2": document, page, passage on the page. */
  id: string;
  /** The `id` of its document in lib/copper/documents.ts. */
  documentId: string;
  /** The document's title, which also starts `text`. */
  title: string;
  /** The PDF page it came from, starting at 1. */
  page: number;
  /** "<title>\n<a few sentences>": what was embedded. */
  text: string;
  /** Unit-length vector from EMBEDDING_MODEL. */
  embedding: number[];
};

export type PassageFile = {
  model: string;
  dimensions: number;
  createdAt: string;
  passages: Passage[];
};

const file = data as PassageFile;

/** Every passage, in document and page order. */
export const PASSAGES: Passage[] = file.passages;

/** Which embedding model made them; a question must use the same one. */
export const PASSAGE_MODEL = { id: file.model, dimensions: file.dimensions };
