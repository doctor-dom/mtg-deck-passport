import { readBracket } from "../bracket";
import { isLandType, normalizeColors } from "../colors";
import { scryfallImage } from "../images";
import { authorFrom } from "../spotlight";
import type { Board, DeckCard } from "../types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BOARD_KEYS: Record<string, Board> = {
  commanders: "commander",
  commander: "commander",
  oathbreakers: "oathbreaker",
  signatureSpells: "signature",
  signatureSpell: "signature",
  mainboard: "main",
  sideboard: "side",
  maybeboard: "side",
  companions: "side",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function readCard(entry: unknown, key: string, board: Board): DeckCard | null {
  if (!entry || typeof entry !== "object") return null;
  const record = entry as Record<string, unknown>;
  const card =
    record.card && typeof record.card === "object"
      ? (record.card as Record<string, unknown>)
      : record;
  const name = text(card.name);
  if (!name) return null;
  const quantity = asNumber(record.quantity) ?? asNumber(card.quantity) ?? 1;
  if (quantity < 1) return null;
  const typeLine = text(card.type_line) || text(card.typeLine);
  const manaValue = asNumber(card.cmc) ?? asNumber(card.mana_value) ?? asNumber(card.manaValue);
  const set = (text(card.set) || text(card.set_code)).toLowerCase();
  const collectorNumber =
    text(card.cn) || text(card.collector_number) || text(card.collectorNumber);
  const scryfallId =
    text(card.scryfall_id) || text(card.scryfallId) || (UUID.test(key) ? key : "");

  return {
    name,
    quantity,
    manaValue,
    typeLine,
    isLand: typeLine ? isLandType(typeLine) : false,
    set: set || undefined,
    collectorNumber: collectorNumber || undefined,
    scryfallId: scryfallId || undefined,
    imageUrl: scryfallId ? scryfallImage(scryfallId, "large") : undefined,
    artCropUrl: scryfallId ? scryfallImage(scryfallId, "art_crop") : undefined,
    colorIdentity: normalizeColors(card.color_identity ?? card.colorIdentity ?? card.colors),
    board,
    detailsIncomplete: manaValue == null || !typeLine,
  };
}

function readBoard(value: unknown, board: Board): DeckCard[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const cards =
    record.cards && typeof record.cards === "object"
      ? (record.cards as Record<string, unknown>)
      : record;
  return Object.entries(cards)
    .map(([key, entry]) => readCard(entry, key, board))
    .filter((card): card is DeckCard => card != null);
}

export type MoxfieldParse = {
  name: string;
  format: string;
  author?: string;
  publicUrl?: string;
  colors: ReturnType<typeof normalizeColors>;
  cards: DeckCard[];
  bracket?: number;
};

export function parseMoxfieldDeck(data: unknown): MoxfieldParse {
  if (!data || typeof data !== "object") {
    throw new Error("Moxfield returned a deck list this app could not read.");
  }
  const record = data as Record<string, unknown>;
  if (record.object === "error" || record.title === "Not Found") {
    throw new Error("That Moxfield deck was not found. It may be private or deleted.");
  }

  const name = text(record.name) || "Untitled deck";
  const format = text(record.format) || "deck";
  const createdBy = record.createdByUser;
  const author = authorFrom(
    createdBy && typeof createdBy === "object"
      ? (createdBy as Record<string, unknown>).displayName ||
          (createdBy as Record<string, unknown>).userName
      : undefined,
  );
  const publicUrl = text(record.publicUrl) || undefined;
  const colors = normalizeColors(record.colorIdentity ?? record.colors);

  const cards: DeckCard[] = [];
  const boards = record.boards;
  if (boards && typeof boards === "object") {
    for (const [key, value] of Object.entries(boards as Record<string, unknown>)) {
      const board = BOARD_KEYS[key];
      if (!board) continue;
      cards.push(...readBoard(value, board));
    }
  } else {
    for (const [key, board] of Object.entries(BOARD_KEYS)) {
      if (key in record) cards.push(...readBoard(record[key], board));
    }
  }

  if (cards.length === 0) {
    throw new Error("That Moxfield deck did not include any cards.");
  }

  return {
    name,
    format,
    author,
    publicUrl,
    colors,
    cards,
    bracket: readBracket(record.bracket) ?? readBracket(record.autoBracket) ?? readBracket(record.commanderBracket),
  };
}
