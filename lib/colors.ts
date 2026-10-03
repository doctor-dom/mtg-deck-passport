import type { ManaColor } from "./types";

export const COLOR_ORDER: ManaColor[] = ["W", "U", "B", "R", "G"];

const WORDS: Record<string, ManaColor> = {
  white: "W",
  w: "W",
  blue: "U",
  u: "U",
  black: "B",
  b: "B",
  red: "R",
  r: "R",
  green: "G",
  g: "G",
};

function addColor(found: Set<ManaColor>, token: string) {
  const word = WORDS[token.trim().toLowerCase()];
  if (word && token.trim().length > 1) {
    found.add(word);
    return;
  }
  const compact = token.trim().toUpperCase();
  if (/^[WUBRG]+$/.test(compact)) {
    for (const color of compact) found.add(color as ManaColor);
  }
}

export function normalizeColors(input: unknown): ManaColor[] {
  const found = new Set<ManaColor>();

  const visit = (value: unknown) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
        const color = WORDS[key.toLowerCase()];
        if (!color) continue;
        if (typeof inner === "number" && inner > 0) found.add(color);
        else if (inner === true) found.add(color);
      }
      return;
    }
    if (typeof value !== "string") return;
    const braces = value.match(/\{([WUBRG])\}/gi);
    if (braces?.length) {
      braces.forEach((pip) => found.add(pip[1].toUpperCase() as ManaColor));
      return;
    }
    addColor(found, value);
  };

  visit(input);
  return COLOR_ORDER.filter((color) => found.has(color));
}

export function isLandType(typeLine: string): boolean {
  const front = typeLine.split("//")[0] ?? typeLine;
  return /\bLand\b/.test(front);
}
