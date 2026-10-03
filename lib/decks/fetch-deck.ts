import QRCode from "qrcode";
import { normalizeColors } from "../colors";
import { enrichCards } from "../scryfall";
import { formatLabelFor, spotlightKindFrom } from "../spotlight";
import type { DeckCard, NormalizedDeck, SpotlightKind } from "../types";
import { canonicalDeckUrl, parseDeckUrl, sourceLabel } from "../urls";
import { parseArchidektDeck } from "./parse-archidekt";
import { parseManaboxHtml } from "./parse-manabox";
import { parseMoxfieldDeck } from "./parse-moxfield";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export class DeckFetchError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type ParsedPieces = {
  name: string;
  format: string;
  author?: string;
  url?: string;
  colors: ReturnType<typeof normalizeColors>;
  cards: DeckCard[];
};

function heroesFor(cards: DeckCard[], kind: SpotlightKind): DeckCard[] {
  if (kind === "oathbreaker") {
    const oathbreakers = cards.filter((card) => card.board === "oathbreaker");
    if (oathbreakers.length > 0) return oathbreakers;
  }
  return cards.filter((card) => card.board === "commander");
}

function assemble(source: NormalizedDeck["source"], id: string, originalUrl: string, pieces: ParsedPieces): Omit<NormalizedDeck, "qrDataUrl"> {
  const hasCommander = pieces.cards.some((card) => card.board === "commander");
  const hasOathbreaker = pieces.cards.some((card) => card.board === "oathbreaker");
  const spotlightKind = spotlightKindFrom(pieces.format, { hasCommander, hasOathbreaker });
  const commanders = heroesFor(pieces.cards, spotlightKind);
  const main = pieces.cards.filter((card) => card.board === "main");
  const fromHeroes = normalizeColors(commanders.flatMap((card) => card.colorIdentity));
  const fromDeck = normalizeColors(main.flatMap((card) => card.colorIdentity));
  const colorIdentity = fromHeroes.length
    ? fromHeroes
    : pieces.colors.length
      ? pieces.colors
      : fromDeck;

  return {
    source,
    sourceLabel: sourceLabel(source),
    url: pieces.url || canonicalDeckUrl(source, id, pieces.name, originalUrl),
    name: pieces.name,
    format: pieces.format,
    formatLabel: formatLabelFor(pieces.format, spotlightKind),
    spotlightKind,
    author: pieces.author,
    commanders,
    cards: main,
    colorIdentity,
    warnings: [],
  };
}

async function readResponse(url: string, accept: string): Promise<{ status: number; text: string; type: string }> {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9",
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  return {
    status: response.status,
    text: await response.text(),
    type: response.headers.get("content-type") ?? "",
  };
}

function parseJson(text: string, source: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new DeckFetchError(`${source} did not return a deck list.`, 502);
  }
}

async function fetchMoxfield(id: string): Promise<unknown> {
  const directUrl = `https://api2.moxfield.com/v3/decks/all/${encodeURIComponent(id)}`;
  try {
    const direct = await readResponse(directUrl, "application/json");
    if (direct.status === 200 && direct.type.includes("json")) {
      return parseJson(direct.text, "Moxfield");
    }
  } catch (error) {
    if (error instanceof DeckFetchError) throw error;
  }

  const readerUrl = `https://r.jina.ai/http://api2.moxfield.com/v3/decks/all/${encodeURIComponent(id)}`;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(readerUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "DeckSpotlight/1.0",
          "X-Return-Format": "text",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(50000),
      });
      if (response.status === 429) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        continue;
      }
      if (!response.ok) {
        throw new DeckFetchError(
          "Moxfield blocked the deck read. Try the link again in a moment.",
          502,
        );
      }
      const envelope = (await response.json()) as { data?: { text?: string; content?: string } };
      const inner = envelope.data?.text ?? envelope.data?.content ?? "";
      const start = inner.indexOf("{");
      const end = inner.lastIndexOf("}");
      if (start < 0 || end <= start) {
        throw new DeckFetchError("Moxfield returned an incomplete deck list. Try the link again.", 502);
      }
      return parseJson(inner.slice(start, end + 1), "Moxfield");
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Moxfield could not be reached.");
    }
  }
  throw new DeckFetchError(
    lastError?.message ||
      "Moxfield blocked this server. The deck link is saved for the poster, but the list could not be read. Try again, or use an Archidekt or ManaBox link.",
    502,
  );
}

async function fetchArchidekt(id: string): Promise<unknown> {
  const response = await readResponse(
    `https://archidekt.com/api/decks/${encodeURIComponent(id)}/`,
    "application/json",
  );
  if (response.status === 404) {
    throw new DeckFetchError(
      "That Archidekt deck was not found. It may be private or the link may be out of date.",
      404,
    );
  }
  if (response.status >= 400) {
    throw new DeckFetchError("Archidekt could not be reached from here.", 502);
  }
  return parseJson(response.text, "Archidekt");
}

async function fetchManabox(id: string): Promise<string> {
  const response = await readResponse(
    `https://manabox.app/decks/${encodeURIComponent(id)}`,
    "text/html",
  );
  if (response.status === 404) {
    throw new DeckFetchError("That ManaBox deck was not found. The share link may have expired.", 404);
  }
  if (response.status >= 400) {
    throw new DeckFetchError("ManaBox could not be reached from here.", 502);
  }
  return response.text;
}

export async function fetchDeck(rawUrl: string): Promise<NormalizedDeck> {
  const parsed = parseDeckUrl(rawUrl);
  if (!parsed) {
    throw new DeckFetchError(
      "Use a deck link from Moxfield, Archidekt, or ManaBox.",
      400,
    );
  }

  let pieces: ParsedPieces;
  if (parsed.source === "moxfield") {
    const data = await fetchMoxfield(parsed.id);
    const deck = parseMoxfieldDeck(data);
    pieces = {
      name: deck.name,
      format: deck.format,
      author: deck.author,
      url: canonicalDeckUrl("moxfield", parsed.id, deck.name, deck.publicUrl),
      colors: deck.colors,
      cards: deck.cards,
    };
  } else if (parsed.source === "archidekt") {
    const data = await fetchArchidekt(parsed.id);
    const deck = parseArchidektDeck(data);
    pieces = { ...deck, url: canonicalDeckUrl("archidekt", parsed.id, deck.name, rawUrl) };
  } else {
    const html = await fetchManabox(parsed.id);
    const deck = parseManaboxHtml(html);
    pieces = { ...deck, url: canonicalDeckUrl("manabox", parsed.id, deck.name, rawUrl) };
  }

  const enriched = await enrichCards(pieces.cards);
  pieces = { ...pieces, cards: enriched.cards };
  const deck = assemble(parsed.source, parsed.id, rawUrl, pieces);
  if (enriched.missed > 0) {
    deck.warnings.push(
      `${enriched.missed} ${enriched.missed === 1 ? "card was" : "cards were"} left out of the mana curve because Scryfall did not recognize the name.`,
    );
  }
  if (deck.cards.length + deck.commanders.length === 0) {
    throw new DeckFetchError("That deck did not include a main deck or commander.", 422);
  }

  const qrDataUrl = await QRCode.toDataURL(deck.url, {
    margin: 1,
    width: 320,
    errorCorrectionLevel: "M",
    color: { dark: "#111827", light: "#ffffff" },
  });

  return { ...deck, qrDataUrl };
}
