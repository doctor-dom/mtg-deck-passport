import { slugify } from "./urls";

const THEME_LABELS = [
  "+1/+1 Counters",
  "-1/-1 Counters",
  "Affinity",
  "Aggro",
  "Aikido",
  "Aristocrats",
  "Artifacts",
  "Attractions",
  "Auras",
  "Battlecruiser",
  "Birthing Pod / Pod",
  "Blink / Flicker",
  "Blue Moon",
  "Budget",
  "Burn",
  "Cascade",
  "Casual",
  "cEDH",
  "Chaos",
  "Clones",
  "Coin Flips",
  "Combo",
  "Control",
  "Cycling",
  "Death & Taxes",
  "Defender",
  "Delver",
  "Devotion",
  "Discard",
  "Discover",
  "Donation",
  "Dredge",
  "Dungeons",
  "Eggs",
  "Enchantments",
  "Energy",
  "Equipment",
  "Extra Combats",
  "Extra Turns",
  "Farm",
  "Flying",
  "Formula X-1",
  "Goad",
  "Goodstuff",
  "Group Hug",
  "Group Slug",
  "Hatebears",
  "Help Wanted",
  "Historic",
  "Infect",
  "Jank",
  "Kindred",
  "Land Destruction",
  "Lands Matter",
  "Legends Matter",
  "Life Bargain",
  "Life Gain",
  "Maverick",
  "Midrange",
  "Mill",
  "Miracles",
  "Modified",
  "Modular",
  "Monarch",
  "Morph",
  "Mutate",
  "Pillowfort",
  "Poison",
  "Primer",
  "Prison",
  "Ramp",
  "Reanimator",
  "Rock",
  "Rule Zero",
  "Snow",
  "Spellslinger",
  "Stax",
  "Stoneblade",
  "Storm",
  "Super Friends",
  "Tempo",
  "Thieves",
  "Tokens",
  "Toolbox",
  "Tron",
  "Turbo",
  "Unmaintained",
  "Vehicles",
  "Voltron",
  "Vorthos",
  "Webcam Friendly",
  "Wheels",
  "X Spells",
  "Zoo",
] as const;

const LEGACY_THEME_IDS: Record<string, string> = {
  aggro: "aggro",
  control: "control",
  combo: "combo",
  midrange: "midrange",
  ramp: "ramp",
};

function themeIdForLabel(label: string): string {
  const legacy = LEGACY_THEME_IDS[slugify(label)];
  if (legacy) return legacy;
  if (label.startsWith("+1/+1")) return "plus-one-counters";
  if (label.startsWith("-1/-1")) return "minus-one-counters";
  const slug = slugify(label);
  return slug || "theme";
}

export type ThemeEntry = { id: string; label: string };

function buildThemes(): ThemeEntry[] {
  const seen = new Set<string>();
  const entries: ThemeEntry[] = [];
  for (const label of THEME_LABELS) {
    let id = themeIdForLabel(label);
    if (seen.has(id)) id = `${id}-${entries.length}`;
    seen.add(id);
    entries.push({ id, label });
  }
  return entries;
}

export const THEMES = buildThemes();

export type Theme = (typeof THEMES)[number]["id"];

export function themeById(id: string): ThemeEntry | undefined {
  return THEMES.find((entry) => entry.id === id);
}

export const MAX_THEME_SELECTION = 3;

export function toggleTheme(current: readonly Theme[], next: Theme): Theme[] {
  if (current.includes(next)) return current.filter((item) => item !== next);
  if (current.length >= MAX_THEME_SELECTION) return [...current];
  return [...current, next];
}

export function endorsementsFromThemes(themes: readonly Theme[]): string {
  return themes
    .map((id) => themeById(id)?.label)
    .filter((label): label is string => Boolean(label))
    .join(", ");
}