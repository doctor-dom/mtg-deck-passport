import type { SpotlightKind } from "./types";

export function spotlightKindFrom(
  format: string,
  flags: { hasCommander: boolean; hasOathbreaker: boolean },
): SpotlightKind {
  const label = format.toLowerCase();
  if (label.includes("oathbreaker") || flags.hasOathbreaker) return "oathbreaker";
  if (label.includes("brawl")) return "brawl";
  if (
    /commander|\bedh\b|predh|tiny leader|canadian highlander|\bduel\b/.test(label) ||
    flags.hasCommander
  ) {
    return "commander";
  }
  return "deck";
}

export function kickerFor(kind: SpotlightKind): string {
  if (kind === "brawl") return "Brawl spotlight";
  if (kind === "oathbreaker") return "Oathbreaker spotlight";
  if (kind === "commander") return "Commander spotlight";
  return "Deck spotlight";
}

export function formatLabelFor(format: string, kind: SpotlightKind): string {
  if (kind === "oathbreaker") return "Oathbreaker";
  if (kind === "brawl") return "Brawl";
  if (kind === "commander") return "Commander";
  const cleaned = format.trim();
  if (!cleaned || cleaned === "deck" || cleaned === "constructed") return "Constructed";
  return cleaned.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function authorFrom(value: unknown): string | undefined {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return undefined;
  if (name.includes("@") && name.includes(".")) return undefined;
  return name.slice(0, 40);
}
