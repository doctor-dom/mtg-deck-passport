import type { DeckCard } from "./types";

export type ManaCurve = {
  buckets: number[];
  average: number;
  spellCount: number;
};

export function manaCurve(cards: DeckCard[]): ManaCurve {
  const buckets = [0, 0, 0, 0, 0, 0, 0, 0];
  let mana = 0;
  let spellCount = 0;

  for (const card of cards) {
    if (card.board !== "main" || card.isLand || card.manaValue == null) continue;
    const quantity = card.quantity;
    const bucket = Math.min(7, Math.max(0, Math.floor(card.manaValue)));
    buckets[bucket] += quantity;
    mana += card.manaValue * quantity;
    spellCount += quantity;
  }

  const average = spellCount === 0 ? 0 : Math.round((mana / spellCount) * 10) / 10;
  return { buckets, average, spellCount };
}

export function formatAverage(average: number): string {
  return average.toFixed(1);
}
