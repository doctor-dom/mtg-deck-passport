import { parseCardSpec } from "@/lib/card-spec";
import { resolveSpec } from "@/lib/scryfall";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { spec?: unknown };
  try {
    body = (await request.json()) as { spec?: unknown };
  } catch {
    return Response.json({ error: "Send a card name to continue." }, { status: 400 });
  }
  const raw = typeof body.spec === "string" ? body.spec.trim() : "";
  const spec = parseCardSpec(raw);
  if (!spec) {
    return Response.json({ error: "Enter a card name." }, { status: 400 });
  }
  try {
    const card = await resolveSpec(spec);
    return Response.json({ card });
  } catch (error) {
    const message = error instanceof Error ? error.message : "That card could not be found.";
    return Response.json({ error: message }, { status: 404 });
  }
}
