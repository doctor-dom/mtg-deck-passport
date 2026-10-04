export type DeckSource = "moxfield" | "archidekt" | "manabox";

export type SpotlightKind = "commander" | "brawl" | "oathbreaker" | "deck";

export type Board =
  | "commander"
  | "oathbreaker"
  | "signature"
  | "main"
  | "side";

export type ManaColor = "W" | "U" | "B" | "R" | "G";

export type DeckCard = {
  name: string;
  quantity: number;
  manaValue: number | null;
  typeLine: string;
  isLand: boolean;
  set?: string;
  collectorNumber?: string;
  scryfallId?: string;
  imageUrl?: string;
  artCropUrl?: string;
  colorIdentity: ManaColor[];
  board: Board;
  detailsIncomplete: boolean;
};

export type NormalizedDeck = {
  source: DeckSource;
  sourceLabel: string;
  url: string;
  name: string;
  format: string;
  formatLabel: string;
  spotlightKind: SpotlightKind;
  author?: string;
  commanders: DeckCard[];
  cards: DeckCard[];
  colorIdentity: ManaColor[];
  bracket?: number;
  warnings: string[];
  qrDataUrl: string;
};

export type ResolvedPrinting = {
  id: string;
  name: string;
  set: string;
  setName: string;
  collectorNumber: string;
  releasedAt: string;
  manaValue: number;
  typeLine: string;
  imageUrl: string;
  artCropUrl: string;
  backImageUrl?: string;
  backName?: string;
  reprint: boolean;
};
