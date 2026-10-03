import { isLandType, normalizeColors } from "./colors";
import type { CardSpec } from "./card-spec";
import type { DeckCard, ResolvedPrinting } from "./types";

const SCRYFALL = "https://api.scryfall.com";
const USER_AGENT = "DeckSpotlight/1.0";

type ScryfallCard = {
  id: string;
  name: string;
  set: string;
  set_name: string;
  collector_number: string;
  released_at: string;
  cmc: number;
  type_line?: string;
  reprint: boolean;
  promo?: boolean;
  digital?: boolean;
  oversized?: boolean;
  border_color?: string;
  layout?: string;
  image_uris?: { large?: string; art_crop?: string; normal?: string };
  card_faces?: Array<{
    name?: string;
    type_line?: string;
    image_uris?: { large?: string; art_crop?: string; normal?: string };
  }>;
  color_identity?: string[];
};

type ScryfallList = {
  data?: ScryfallCard[];
  has_more?: boolean;
  next_page?: string;
  details?: string;
  object?: string;
};

type ScryfallError = {
  object?: string;
  details?: string;
  status?: number;
};

let queue: Promise<unknown> = Promise.resolve();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scryfallFetch(url: string, init?: RequestInit): Promise<Response> {
  const run = queue.then(async () => {
    await sleep(70);
    return fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function exactQuery(name: string): string {
  return `!"${name.replaceAll('"', "")}"`;
}

function toPrinting(card: ScryfallCard): ResolvedPrinting {
  const uris = card.image_uris ?? card.card_faces?.[0]?.image_uris;
  return {
    id: card.id,
    name: card.name,
    set: card.set,
    setName: card.set_name,
    collectorNumber: card.collector_number,
    releasedAt: card.released_at,
    manaValue: card.cmc ?? 0,
    typeLine: card.type_line ?? card.card_faces?.[0]?.type_line ?? "",
    imageUrl: uris?.large ?? uris?.normal ?? "",
    artCropUrl: uris?.art_crop ?? uris?.normal ?? "",
    reprint: Boolean(card.reprint),
  };
}

function usablePrinting(card: ScryfallCard): boolean {
  if (card.layout === "art_series" || card.layout === "token" || card.layout === "double_faced_token") {
    return false;
  }
  if (card.oversized || card.digital) return false;
  if (card.border_color === "art") return false;
  return true;
}

async function searchPrintings(query: string, limit: number): Promise<ScryfallCard[]> {
  const cards: ScryfallCard[] = [];
  let url = `${SCRYFALL}/cards/search?${new URLSearchParams({
    q: query,
    unique: "prints",
    order: "released",
    dir: "asc",
  })}`;

  while (url && cards.length < limit) {
    const response = await scryfallFetch(url);
    if (response.status === 404) return cards;
    if (!response.ok) {
      throw new Error("Scryfall could not look up that card just now. Try again in a moment.");
    }
    const body = (await response.json()) as ScryfallList;
    cards.push(...(body.data ?? []));
    url = body.has_more && body.next_page ? body.next_page : "";
  }
  return cards.slice(0, limit);
}

export async function getPrintings(name: string): Promise<ResolvedPrinting[]> {
  const cleaned = name.trim();
  if (!cleaned) return [];
  let cards = await searchPrintings(`${exactQuery(cleaned)} game:paper`, 250);
  if (cards.length === 0) cards = await searchPrintings(exactQuery(cleaned), 80);
  const usable = cards.filter(usablePrinting);
  return (usable.length ? usable : cards).map(toPrinting);
}

async function readCardResponse(response: Response): Promise<ScryfallCard | null> {
  if (response.status === 404) return null;
  const body = (await response.json()) as ScryfallCard & ScryfallError;
  if (!response.ok || body.object === "error") {
    if (response.status >= 500) {
      throw new Error("Scryfall could not look up that card just now. Try again in a moment.");
    }
    return null;
  }
  return body;
}

function namesMatch(card: ScryfallCard, name: string): boolean {
  const wanted = name.trim().toLowerCase();
  if (card.name.toLowerCase() === wanted) return true;
  return card.card_faces?.some((face) => face.name?.toLowerCase() === wanted) ?? false;
}

export async function resolveSpec(spec: CardSpec): Promise<ResolvedPrinting> {
  if (spec.set && spec.collectorNumber) {
    const response = await scryfallFetch(
      `${SCRYFALL}/cards/${encodeURIComponent(spec.set)}/${encodeURIComponent(spec.collectorNumber)}`,
    );
    const card = await readCardResponse(response);
    if (!card || !namesMatch(card, spec.name)) {
      throw new Error(
        `No printing of ${spec.name} matches ${spec.set.toUpperCase()} #${spec.collectorNumber}.`,
      );
    }
    return toPrinting(card);
  }

  if (spec.set) {
    const params = new URLSearchParams({ exact: spec.name, set: spec.set });
    const named = await readCardResponse(
      await scryfallFetch(`${SCRYFALL}/cards/named?${params}`),
    );
    if (named) return toPrinting(named);
    const fuzzy = new URLSearchParams({ fuzzy: spec.name, set: spec.set });
    const loose = await readCardResponse(
      await scryfallFetch(`${SCRYFALL}/cards/named?${fuzzy}`),
    );
    if (loose) return toPrinting(loose);
    throw new Error(`No printing of ${spec.name} was found in set ${spec.set.toUpperCase()}.`);
  }

  const paper = await searchPrintings(`${exactQuery(spec.name)} game:paper`, 40);
  const original = paper.find((card) => usablePrinting(card) && !card.promo) ?? paper.find(usablePrinting) ?? paper[0];
  if (original) return toPrinting(original);

  const anyPrinting = await readCardResponse(
    await scryfallFetch(`${SCRYFALL}/cards/named?${new URLSearchParams({ exact: spec.name })}`),
  );
  if (anyPrinting) return toPrinting(anyPrinting);

  const fuzzy = await readCardResponse(
    await scryfallFetch(`${SCRYFALL}/cards/named?${new URLSearchParams({ fuzzy: spec.name })}`),
  );
  if (fuzzy) return toPrinting(fuzzy);
  throw new Error(`Scryfall could not find a card named ${spec.name}.`);
}

type Identifier = { id: string } | { set: string; collector_number: string } | { name: string };

function identifierFor(card: DeckCard): Identifier {
  if (card.scryfallId && /^[0-9a-f-]{36}$/i.test(card.scryfallId)) return { id: card.scryfallId };
  if (card.set && card.collectorNumber) {
    return { set: card.set, collector_number: card.collectorNumber };
  }
  return { name: card.name };
}

function applyScryfallCard(card: DeckCard, printing: ScryfallCard): DeckCard {
  const resolved = toPrinting(printing);
  return {
    ...card,
    manaValue: resolved.manaValue,
    typeLine: resolved.typeLine || card.typeLine,
    isLand: isLandType(resolved.typeLine || card.typeLine),
    set: card.set || resolved.set,
    collectorNumber: card.collectorNumber || resolved.collectorNumber,
    scryfallId: card.scryfallId || resolved.id,
    imageUrl: resolved.imageUrl || card.imageUrl,
    artCropUrl: resolved.artCropUrl || card.artCropUrl,
    colorIdentity: card.colorIdentity.length
      ? card.colorIdentity
      : normalizeColors(printing.color_identity),
    detailsIncomplete: false,
  };
}

export async function enrichCards(cards: DeckCard[]): Promise<{ cards: DeckCard[]; missed: number }> {
  const pending = cards.filter((card) => card.detailsIncomplete);
  if (pending.length === 0) return { cards, missed: 0 };

  const resolved = new Map<string, ScryfallCard>();
  const missedNames = new Set<string>();

  for (let index = 0; index < pending.length; index += 75) {
    const chunk = pending.slice(index, index + 75);
    const identifiers = chunk.map(identifierFor);
    const response = await scryfallFetch(`${SCRYFALL}/cards/collection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers }),
    });
    if (!response.ok) {
      throw new Error("Scryfall could not fill in mana values for this deck. Try again in a moment.");
    }
    const body = (await response.json()) as {
      data?: ScryfallCard[];
      not_found?: Identifier[];
    };
    for (const card of body.data ?? []) {
      resolved.set(card.id, card);
      resolved.set(card.name.toLowerCase(), card);
      resolved.set(`${card.set}:${card.collector_number}`.toLowerCase(), card);
    }
    for (const missing of body.not_found ?? []) {
      if ("name" in missing) missedNames.add(missing.name.toLowerCase());
      if ("id" in missing) missedNames.add(missing.id);
    }
  }

  let missed = 0;
  const next = cards.map((card) => {
    if (!card.detailsIncomplete) return card;
    const byId = card.scryfallId ? resolved.get(card.scryfallId) : undefined;
    const bySet =
      card.set && card.collectorNumber
        ? resolved.get(`${card.set}:${card.collectorNumber}`.toLowerCase())
        : undefined;
    const byName = resolved.get(card.name.toLowerCase());
    const match = byId ?? bySet ?? byName;
    if (!match) {
      missed += card.quantity;
      return { ...card, detailsIncomplete: false, manaValue: card.manaValue };
    }
    return applyScryfallCard(card, match);
  });

  return { cards: next, missed };
}
