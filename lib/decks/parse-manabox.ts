import { normalizeColors } from "../colors";
import { upgradeScryfallVersion } from "../images";
import type { Board, DeckCard, ManaColor } from "../types";

const TYPE_NAMES = [
  "Planeswalker",
  "Creature",
  "Artifact",
  "Instant",
  "Sorcery",
  "Enchantment",
  "Battle",
  "Land",
  "Card",
];

function unwrap(value: unknown): unknown {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number"
  ) {
    return unwrap(value[1]);
  }
  if (Array.isArray(value)) return value.map(unwrap);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
        key,
        unwrap(inner),
      ]),
    );
  }
  return value;
}

function boardFor(category: number, format: string): Board {
  if (category === 0) return "commander";
  if (category === 1) return "oathbreaker";
  if (category === 2) return "signature";
  if (category === 4 || category === 5) return "side";
  if (category === 3) return "main";
  return /commander|brawl|oathbreaker|edh/i.test(format) && category === 0
    ? "commander"
    : "main";
}

function imageFields(url: string | undefined): { imageUrl?: string; artCropUrl?: string } {
  if (!url) return {};
  return {
    imageUrl: upgradeScryfallVersion(url, "large"),
    artCropUrl: upgradeScryfallVersion(url, "art_crop"),
  };
}

export type ManaBoxParse = {
  name: string;
  format: string;
  colors: ManaColor[];
  cards: DeckCard[];
};

export function parseManaboxHtml(html: string): ManaBoxParse {
  const islands = [...html.matchAll(/<astro-island\b([^>]*)>/g)];
  if (islands.length === 0) {
    throw new Error("That ManaBox page did not include a deck. The link may be private or expired.");
  }

  let deck: Record<string, unknown> | null = null;
  for (const island of islands) {
    const propsMatch = island[1]?.match(/\bprops="([^"]*)"/);
    if (!propsMatch?.[1]) continue;
    const decoded = propsMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      continue;
    }
    const unwrapped = unwrap(parsed) as { deck?: unknown };
    if (unwrapped?.deck && typeof unwrapped.deck === "object") {
      const candidate = unwrapped.deck as Record<string, unknown>;
      if (Array.isArray(candidate.cards)) {
        deck = candidate;
        break;
      }
    }
  }

  if (!deck) {
    throw new Error("ManaBox changed how shared decks are published, so this link could not be read.");
  }

  const format = typeof deck.format === "string" ? deck.format : "deck";
  const cards: DeckCard[] = [];
  for (const entry of deck.cards as unknown[]) {
    if (!entry || typeof entry !== "object") continue;
    const card = entry as Record<string, unknown>;
    const name = typeof card.name === "string" ? card.name.trim() : "";
    if (!name) continue;
    const quantity = typeof card.quantity === "number" ? card.quantity : 1;
    if (quantity < 1) continue;
    const typeIndex = typeof card.type === "number" ? card.type : 8;
    const typeName = TYPE_NAMES[typeIndex] ?? "Card";
    const manaValue = typeof card.manaValue === "number" ? card.manaValue : null;
    const images = Array.isArray(card.images) ? card.images : [];
    const firstImage = images.find(
      (image) => image && typeof image === "object" && "imageUrlNormal" in image,
    ) as { imageUrlNormal?: string } | undefined;
    const pictures = imageFields(firstImage?.imageUrlNormal);
    const set = typeof card.setId === "string" ? card.setId.toLowerCase() : undefined;
    const collectorNumber =
      card.collectorNumber == null ? undefined : String(card.collectorNumber);

    cards.push({
      name,
      quantity,
      manaValue,
      typeLine: typeName,
      isLand: typeIndex === 7,
      set,
      collectorNumber,
      imageUrl: pictures.imageUrl,
      artCropUrl: pictures.artCropUrl,
      colorIdentity: normalizeColors(card.colorIdentity),
      board: boardFor(typeof card.boardCategory === "number" ? card.boardCategory : 3, format),
      detailsIncomplete: manaValue == null,
    });
  }

  if (cards.length === 0) {
    throw new Error("That ManaBox deck did not include any cards.");
  }

  return {
    name: typeof deck.name === "string" && deck.name.trim() ? deck.name.trim() : "Untitled deck",
    format,
    colors: normalizeColors(deck.colors),
    cards,
  };
}
