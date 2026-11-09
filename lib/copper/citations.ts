// Copper cites the support docs like "[Copper Home User Guide, p. 9]". This
// splits a reply into plain text and citations, and gives each citation a link
// that opens the PDF at that page. Only the four real documents become links;
// anything else in brackets stays plain text. Safe to use in client components.
import { type CopperDocument, DOCUMENTS } from "@/lib/copper/documents";

export type ReplyPart =
  | { type: "text"; text: string }
  | {
      type: "citation";
      text: string;
      title: string;
      page: number;
      url: string;
    };

const CITATION = /\[([^\[\]]+?),\s*p(?:age|\.)?\s*(\d+)\]/gi;

const normalize = (title: string) =>
  title.toLowerCase().replace(/\s+/g, " ").trim();

/** The document a cited title means: an exact match, or a shortened title. */
export function documentFor(title: string): CopperDocument | undefined {
  const wanted = normalize(title);
  return (
    DOCUMENTS.find((d) => normalize(d.title) === wanted) ??
    DOCUMENTS.find((d) => normalize(d.title).endsWith(wanted))
  );
}

export function splitCitations(reply: string): ReplyPart[] {
  const parts: ReplyPart[] = [];
  let last = 0;
  for (const match of reply.matchAll(CITATION)) {
    const doc = documentFor(match[1]);
    if (!doc) continue;
    const page = Number(match[2]);
    if (match.index > last)
      parts.push({ type: "text", text: reply.slice(last, match.index) });
    parts.push({
      type: "citation",
      text: match[0],
      title: doc.title,
      page,
      url: `${doc.file}#page=${page}`,
    });
    last = match.index + match[0].length;
  }
  if (last < reply.length)
    parts.push({ type: "text", text: reply.slice(last) });
  return parts;
}
