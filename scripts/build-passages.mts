// npm run passages:build: reads every PDF in public/docs/, splits each page
// into passages of a few sentences, embeds them with Gemini and saves them to
// lib/copper/data/passages.json, which the app loads when it starts.
// Run it again whenever a PDF changes.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import { callEmbedMany, isAiConfigured } from "@/lib/ai/call";
import { EMBEDDING_MODEL } from "@/lib/ai/models";
import { DOCUMENTS } from "@/lib/copper/documents";
import { passageText, splitPage } from "@/lib/copper/passage-split";
import type { Passage, PassageFile } from "@/lib/copper/passages";

const OUT = join("lib", "copper", "data", "passages.json");

if (!isAiConfigured()) {
  console.error(
    "passages:build: add GOOGLE_GENERATIVE_AI_API_KEY to .env.local first.",
  );
  process.exit(1);
}

const passages: Omit<Passage, "embedding">[] = [];
for (const doc of DOCUMENTS) {
  const bytes = readFileSync(join("public", doc.file));
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text: pages } = await extractText(pdf, { mergePages: false });
  pages.forEach((raw, index) => {
    const page = index + 1;
    splitPage(raw).forEach((passage, n) => {
      passages.push({
        id: `${doc.id}-p${page}-${n + 1}`,
        documentId: doc.id,
        title: doc.title,
        page,
        text: passageText(doc.title, passage),
      });
    });
  });
  console.log(
    `${doc.title}: ${pages.length} pages, ` +
      `${passages.filter((p) => p.documentId === doc.id).length} passages`,
  );
}

const embeddings = await callEmbedMany(
  { module: 3, feature: "doc-embeddings" },
  passages.map((p) => p.text),
  "RETRIEVAL_DOCUMENT",
);

// Six decimal places is plenty for comparing vectors and halves the file size.
const round = (x: number) => Math.round(x * 1e6) / 1e6;
const file: PassageFile = {
  model: EMBEDDING_MODEL.id,
  dimensions: EMBEDDING_MODEL.dimensions,
  createdAt: new Date().toISOString(),
  passages: passages.map((p, i) => ({
    ...p,
    embedding: embeddings[i].map(round),
  })),
};
writeFileSync(OUT, `${JSON.stringify(file)}\n`);
console.log(`Saved ${file.passages.length} passages to ${OUT}`);
