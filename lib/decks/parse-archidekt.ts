import { readBracket } from "../bracket";
import { isLandType, normalizeColors } from "../colors";
import { scryfallImage } from "../images";
import { authorFrom } from "../spotlight";
import type { Board, DeckCard } from "../types";

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

function boardFor(names: string[], companion: boolean): Board {
  const normalized = names.map((name) => name.toLowerCase());
  if (normalized.some((name) => name === "commander" || name === "commanders")) {
    return "commander";
  }
  if (normalized.some((name) => name === "oathbreaker")) return "oathbreaker";
  if (normalized.some((name) => name.includes("signature spell"))) return "signature";
  if (
    normalized.some((name) =>
      ["sideboard", "maybeboard", "considering", "wishlist"].includes(name),
    )
  ) {
    return "side";
  }
  if (companion) return "side";
  return "main";
}

function categoryNames(
  value: unknown,
  byId: Map<string, string>,
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (typeof item === "number") return byId.get(String(item)) ?? "";
      if (item && typeof item === "object" && "name" in item) {
        return text((item as { name?: unknown }).name);
      }
      return "";
    })
    .filter(Boolean);
}

function typeLineOf(oracle: Record<string, unknown>): string {
  const superTypes = Array.isArray(oracle.superTypes)
    ? oracle.superTypes.filter((part): part is string => typeof part === "string")
    : [];
  const types = Array.isArray(oracle.types)
    ? oracle.types.filter((part): part is string => typeof part === "string")
    : [];
  const subTypes = Array.isArray(oracle.subTypes)
    ? oracle.subTypes.filter((part): part is string => typeof part === "string")
    : [];
  const left = [...superTypes, ...types].join(" ");
  if (!left && !subTypes.length) return text(oracle.type_line) || text(oracle.typeLine);
  return subTypes.length ? `${left} — ${subTypes.join(" ")}` : left;
}

export type ArchidektParse = {
  name: string;
  format: string;
  author?: string;
  colors: ReturnType<typeof normalizeColors>;
  cards: DeckCard[];
  bracket?: number;
};

export function parseArchidektDeck(data: unknown): ArchidektParse {
  if (!data || typeof data !== "object") {
    throw new Error("Archidekt returned a deck list this app could not read.");
  }
  const record = data as Record<string, unknown>;
  if (typeof record.error === "string") {
    throw new Error(
      record.error === "Deck not found."
        ? "That Archidekt deck was not found. It may be private or the link may be out of date."
        : record.error,
    );
  }

  const byId = new Map<string, string>();
  if (Array.isArray(record.categories)) {
    for (const category of record.categories) {
      if (!category || typeof category !== "object") continue;
      const item = category as Record<string, unknown>;
      if (item.id != null && text(item.name)) byId.set(String(item.id), text(item.name));
    }
  }

  const entries = Array.isArray(record.cards)
    ? record.cards
    : record.cardMap && typeof record.cardMap === "object"
      ? Object.values(record.cardMap as Record<string, unknown>)
      : [];

  const cards: DeckCard[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (row.deletedAt) continue;
    const printing =
      row.card && typeof row.card === "object"
        ? (row.card as Record<string, unknown>)
        : row;
    const oracle =
      printing.oracleCard && typeof printing.oracleCard === "object"
        ? (printing.oracleCard as Record<string, unknown>)
        : printing;
    const name = text(oracle.name) || text(printing.displayName);
    if (!name) continue;
    const quantity = asNumber(row.quantity) ?? asNumber(row.qty) ?? 1;
    if (quantity < 1) continue;

    const edition =
      printing.edition && typeof printing.edition === "object"
        ? (printing.edition as Record<string, unknown>)
        : undefined;
    const set = (
      text(edition?.editioncode) ||
      text(printing.setCode) ||
      text(printing.set)
    ).toLowerCase();
    const collectorNumber = text(printing.collectorNumber) || text(printing.collector_number);
    const scryfallId = text(printing.uid) || text(printing.scryfall_id);
    const typeLine = typeLineOf(oracle);
    const manaValue = asNumber(row.customCmc) ?? asNumber(oracle.cmc) ?? asNumber(printing.cmc);
    const names = categoryNames(row.categories ?? printing.categories, byId);

    cards.push({
      name,
      quantity,
      manaValue,
      typeLine,
      isLand: typeLine ? isLandType(typeLine) : (oracle.types as unknown[] | undefined)?.includes("Land") === true,
      set: set || undefined,
      collectorNumber: collectorNumber || undefined,
      scryfallId: scryfallId || undefined,
      imageUrl: scryfallId ? scryfallImage(scryfallId, "large") : undefined,
      artCropUrl: scryfallId ? scryfallImage(scryfallId, "art_crop") : undefined,
      colorIdentity: normalizeColors(oracle.colorIdentity ?? oracle.color_identity ?? oracle.colors),
      board: boardFor(names, row.companion === true || printing.companion === true),
      detailsIncomplete: manaValue == null || !typeLine,
    });
  }

  if (cards.length === 0) {
    throw new Error("That Archidekt deck did not include any cards.");
  }

  const owner = record.owner;
  const formatValue = record.deckFormat ?? record.format;
  const format =
    typeof formatValue === "number"
      ? formatValue === 3
        ? "commander"
        : "deck"
      : text(formatValue) || "deck";

  return {
    name: text(record.name) || "Untitled deck",
    format,
    author: authorFrom(
      owner && typeof owner === "object" ? (owner as Record<string, unknown>).username : undefined,
    ),
    colors: normalizeColors(record.colors),
    cards,
    bracket:
      readBracket(record.bracket) ??
      readBracket(record.commanderBracket) ??
      readBracket(record.edhBracket),
  };
}
