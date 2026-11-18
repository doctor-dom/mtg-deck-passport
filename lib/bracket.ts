export const BRACKETS = [
  { value: 1, name: "Exhibition" },
  { value: 2, name: "Core" },
  { value: 3, name: "Upgraded" },
  { value: 4, name: "Optimized" },
  { value: 5, name: "cEDH" },
] as const;

export function readBracket(value: unknown, depth = 0): number | undefined {
  if (depth > 3) return undefined;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5) return value;
  if (typeof value === "string" && /^[1-5]$/.test(value.trim())) return Number(value.trim());
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  for (const key of ["bracket", "commanderBracket", "autoBracket", "bracketGuess", "value"]) {
    if (!(key in record)) continue;
    const found = readBracket(record[key], depth + 1);
    if (found) return found;
  }
  return undefined;
}

export function bracketName(value: number | null | undefined): string | undefined {
  return BRACKETS.find((item) => item.value === value)?.name;
}

const LEVEL_WORDS = ["One", "Two", "Three", "Four", "Five"] as const;

export function passportTypeLine(value: number | null | undefined): string | undefined {
  if (value == null || value < 1 || value > 5) return undefined;
  const name = bracketName(value);
  if (!name) return undefined;
  return `Level ${LEVEL_WORDS[value - 1]} - ${name}`;
}
