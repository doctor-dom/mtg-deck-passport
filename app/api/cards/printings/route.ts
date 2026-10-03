import { getPrintings } from "@/lib/scryfall";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!name) {
    return Response.json({ error: "Name a card to see its printings." }, { status: 400 });
  }
  try {
    const printings = await getPrintings(name);
    if (printings.length === 0) {
      return Response.json(
        { error: `Scryfall could not find printings for ${name}.` },
        { status: 404 },
      );
    }
    return Response.json({ printings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Printings could not be loaded.";
    return Response.json({ error: message }, { status: 502 });
  }
}
