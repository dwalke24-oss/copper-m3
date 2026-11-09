// Next.js runs register() once when the server starts, before it handles any
// request. Loading the document passages here puts them in memory up front.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { PASSAGES } = await import("@/lib/copper/passages");
    console.info(`[passages] loaded ${PASSAGES.length} document passages`);
  }
}
