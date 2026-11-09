// Splits the text of one PDF page into passages of a few sentences each, so
// Ask Copper can find (and cite) the exact part of a document that answers a
// question. Used by scripts/build-passages.ts; pure text in, text out.

/** A passage closes once it has this many sentences… */
const MAX_SENTENCES = 4;
/** …or would grow past this many characters. */
const MAX_CHARS = 600;
/** A last passage shorter than this joins the one before it on the page. */
const MIN_CHARS = 120;

/**
 * Turns a page's raw text into clean lines: drops the running header every
 * page repeats (company name, document code, copyright line) and rejoins
 * sentences that the PDF wrapped across lines.
 */
export function cleanPage(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const copyright = lines.slice(0, 4).findIndex((l) => l.startsWith("©"));
  const body = copyright === -1 ? lines : lines.slice(copyright + 1);

  const joined: string[] = [];
  for (const line of body) {
    const prev = joined.at(-1);
    const newItem = /^(•|\d+(\.\d+)*\s)/.test(line);
    const continues =
      /^[a-z]/.test(line) || (/[,;–—-]$/.test(prev ?? "") && !newItem);
    if (prev !== undefined && continues) {
      joined[joined.length - 1] = `${prev} ${line}`;
    } else {
      joined.push(line);
    }
  }
  return joined;
}

const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });

/** Splits lines into sentences (a heading or list item counts as one). */
export function sentences(lines: string[]): string[] {
  return lines.flatMap((line) =>
    Array.from(segmenter.segment(line), (s) => s.segment.trim()).filter(
      Boolean,
    ),
  );
}

/** A short line with no closing punctuation, like "2.2 Setup steps". */
function isHeading(sentence: string): boolean {
  return (
    sentence.length < 80 &&
    !sentence.startsWith("•") &&
    !/[.!?:"”')]$/.test(sentence)
  );
}

/** Splits one page's raw text into passages of a few sentences. */
export function splitPage(raw: string): string[] {
  const passages: string[] = [];
  let current: string[] = [];
  const bodyCount = (parts: string[]) =>
    parts.filter((s) => !isHeading(s)).length;

  for (const sentence of sentences(cleanPage(raw))) {
    const tooMany = bodyCount(current) >= MAX_SENTENCES;
    const tooLong = [...current, sentence].join(" ").length > MAX_CHARS;
    if (current.length > 0 && bodyCount(current) > 0 && (tooMany || tooLong)) {
      // A heading belongs with the text after it, so carry it forward.
      const carry: string[] = [];
      while (current.length > 0 && isHeading(current.at(-1)!)) {
        carry.unshift(current.pop()!);
      }
      if (current.length > 0) passages.push(current.join(" "));
      current = carry;
    }
    current.push(sentence);
  }

  const tail = current.join(" ");
  if (tail && passages.length > 0 && tail.length < MIN_CHARS) {
    passages[passages.length - 1] += ` ${tail}`;
  } else if (tail) {
    passages.push(tail);
  }
  return passages;
}

/** The text that gets embedded and shown: the document title comes first. */
export function passageText(title: string, passage: string): string {
  return `${title}\n${passage}`;
}
