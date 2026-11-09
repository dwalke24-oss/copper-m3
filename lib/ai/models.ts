// The course's approved models. Calls go straight to Google with a Google AI
// Studio key, which is free and needs no credit card.
export const MODELS = [
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash (fast, shows its thinking)",
    // Google's own name for it, used when calling Google.
    googleId: "gemini-2.5-flash",
  },
  {
    id: "google/gemini-3-flash",
    label: "Gemini 3 Flash (newer, thinks out loud less often)",
    googleId: "gemini-3-flash-preview",
  },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

/**
 * The model used when a call doesn't name one. Google stopped offering
 * Gemini 2.5 Flash to new API keys in 2026-11, so the default is 3 Flash.
 * Set AI_MODEL to pick the other one where it still works.
 */
export const DEFAULT_MODEL: ModelId = "google/gemini-3-flash";

/** AI_MODEL if it names an approved model, otherwise the default. */
export function defaultModel(): ModelId {
  const id = process.env.AI_MODEL;
  return MODELS.find((m) => m.id === id)?.id ?? DEFAULT_MODEL;
}

/**
 * The embedding model: turns text into a list of numbers (a vector) so the app
 * can find passages whose meaning is close to a question. 768 numbers per
 * passage keeps the saved file small while keeping search quality high.
 */
export const EMBEDDING_MODEL = {
  id: "google/gemini-embedding-001",
  googleId: "gemini-embedding-001",
  dimensions: 768,
} as const;

export type EmbeddingModelId = (typeof EMBEDDING_MODEL)["id"];
