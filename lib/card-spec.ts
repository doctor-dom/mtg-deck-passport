import type { DeckCard } from "./types";

export type CardSpec = {
  name: string;
  set?: string;
  collectorNumber?: string;
};

const SET_AND_NUMBER =
  /^([A-Za-z0-9]{3,6})(?:[\s#/-]+((?:[A-Za-z]-)?[0-9]+[A-Za-z★*]?))?$/;

export function parseCardSpec(raw: string): CardSpec | null {
  const input = raw.trim();
  if (!input) return null;

  let name = input;
  let spec = "";
  const pipe = input.indexOf("|");
  if (pipe >= 0) {
    name = input.slice(0, pipe).trim();
    spec = input.slice(pipe + 1).trim();
  } else {
    const paren = input.match(
      /^(.*?)\s+\(([A-Za-z0-9]{3,6})\)(?:\s+((?:[A-Za-z]-)?[0-9]+[A-Za-z★*]?))?$/,
    );
    if (paren?.[1] && paren[2]) {
      name = paren[1].trim();
      spec = [paren[2], paren[3]].filter(Boolean).join(" ");
    }
  }

  if (!name) return null;
  if (!spec) return { name };

  spec = spec.replace(/^set[:\s]+/i, "").trim();
  const match = spec.match(SET_AND_NUMBER);
  if (!match?.[1]) return { name, set: spec.toLowerCase() };
  const collectorNumber = match[2]?.replace("★", "*");
  return {
    name,
    set: match[1].toLowerCase(),
    ...(collectorNumber ? { collectorNumber } : {}),
  };
}

export function specFromCard(card: DeckCard): string {
  if (card.set && card.collectorNumber) {
    return `${card.name}|${card.set.toUpperCase()} ${card.collectorNumber}`;
  }
  if (card.set) return `${card.name}|${card.set.toUpperCase()}`;
  return card.name;
}
