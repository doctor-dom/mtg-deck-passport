import { readSetSymbol } from "@/lib/set-symbol";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const ink = new URL(request.url).searchParams.get("ink") ?? "#1e4b7a";
  const svg = readSetSymbol(code, ink);
  if (!svg) return new Response("Unknown set symbol.", { status: 404 });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
