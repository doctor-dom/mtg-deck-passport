import { DeckFetchError, fetchDeck } from "@/lib/decks/fetch-deck";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { url?: unknown };
  try {
    body = (await request.json()) as { url?: unknown };
  } catch {
    return Response.json({ error: "Send a deck link to continue." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url : "";
  try {
    const deck = await fetchDeck(url);
    return Response.json({ deck });
  } catch (error) {
    if (error instanceof DeckFetchError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "The deck could not be read.";
    return Response.json({ error: message }, { status: 500 });
  }
}
