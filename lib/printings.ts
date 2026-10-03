import type { DeckCard, ResolvedPrinting } from "./types";

export function defaultPrintingId(printings: ResolvedPrinting[], card: DeckCard): string {
  const set = card.set?.toLowerCase();
  const number = card.collectorNumber?.replace(/^0+/, "").toLowerCase();
  if (set && number) {
    const exact = printings.find(
      (printing) =>
        printing.set.toLowerCase() === set &&
        printing.collectorNumber.replace(/^0+/, "").toLowerCase() === number,
    );
    if (exact) return exact.id;
  }
  if (set) {
    const inSet = printings.filter((printing) => printing.set.toLowerCase() === set);
    if (inSet.length === 1) return inSet[0].id;
  }
  return printings[0]?.id ?? "";
}

export function printingOptionLabel(printing: ResolvedPrinting, index: number): string {
  const year = printing.releasedAt.slice(0, 4);
  const original = index === 0 ? "Original · " : "";
  return `${original}${printing.setName} (${printing.set.toUpperCase()}) #${printing.collectorNumber} · ${year}`;
}
