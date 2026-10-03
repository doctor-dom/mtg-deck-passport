import { assertScryfallImageUrl } from "@/lib/images";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  try {
    const url = assertScryfallImageUrl(raw);
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": "DeckSpotlight/1.0",
      },
      cache: "force-cache",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok || !response.body) {
      return new Response("Card image unavailable.", { status: 502 });
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new Response("Card image unavailable.", { status: 502 });
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Card image unavailable.";
    return new Response(message, { status: 400 });
  }
}
