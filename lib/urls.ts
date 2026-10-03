import type { DeckSource } from "./types";

export type ParsedDeckUrl = {
  source: DeckSource;
  id: string;
};

const SOURCE_LABEL: Record<DeckSource, string> = {
  moxfield: "Moxfield",
  archidekt: "Archidekt",
  manabox: "ManaBox",
};

export function sourceLabel(source: DeckSource): string {
  return SOURCE_LABEL[source];
}

export function parseDeckUrl(input: string): ParsedDeckUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "moxfield.com" && parts[0] === "decks" && parts[1]) {
    return { source: "moxfield", id: decodeURIComponent(parts[1]) };
  }
  if (host === "archidekt.com" && parts[0] === "decks" && /^\d+$/.test(parts[1] ?? "")) {
    return { source: "archidekt", id: parts[1] };
  }
  if (host === "manabox.app" && parts[0] === "decks" && parts[1]) {
    return { source: "manabox", id: decodeURIComponent(parts[1]) };
  }
  return null;
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function canonicalDeckUrl(
  source: DeckSource,
  id: string,
  name: string,
  originalUrl?: string,
): string {
  if (source === "moxfield") return `https://moxfield.com/decks/${id}`;
  if (source === "manabox") return `https://manabox.app/decks/${id}`;
  const fromOriginal = originalUrl?.match(/\/decks\/\d+\/([^/?#]+)/)?.[1];
  const slug = fromOriginal || slugify(name);
  return slug
    ? `https://archidekt.com/decks/${id}/${slug}`
    : `https://archidekt.com/decks/${id}`;
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
