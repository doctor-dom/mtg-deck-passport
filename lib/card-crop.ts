/** Full card aspect used in Scryfall `large` images (745 × 1040). */
export const CARD_ASPECT = 1040 / 745;

export type CardSliceCrop = {
  /** Top of the name banner as a fraction of card height. */
  nameTop: number;
  /** Height of the name banner window as a fraction of card height. */
  nameBand: number;
  /** Top of the type-line + rules window as a fraction of card height. */
  rulesTop: number;
  /** Height of the type-line + rules window as a fraction of card height. */
  rulesBand: number;
};

export type PixelBuffer = {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
};

/**
 * M15-style fallback when a card image cannot be read.
 * Name window is the title bar + mana; rules window is type line through P/T.
 */
export const SECONDARY_SLICE_CROP: CardSliceCrop = {
  nameTop: 0.028,
  nameBand: 0.072,
  rulesTop: 0.556,
  rulesBand: 0.388,
};

export function objectPositionY(start: number, band: number): string {
  const visible = 1 - band;
  if (visible <= 1e-6) return "0%";
  const y = Math.min(1, Math.max(0, start / visible));
  return `${(y * 100).toFixed(2)}%`;
}

export function nameObjectPositionY(crop: CardSliceCrop = SECONDARY_SLICE_CROP): string {
  return objectPositionY(crop.nameTop, crop.nameBand);
}

export function rulesObjectPositionY(crop: CardSliceCrop = SECONDARY_SLICE_CROP): string {
  return objectPositionY(crop.rulesTop, crop.rulesBand);
}

export function sliceHeightsForWidth(
  cardWidth: number,
  crop: CardSliceCrop = SECONDARY_SLICE_CROP,
): { nameHeight: number; cardHeight: number; rulesHeight: number } {
  const cardHeight = cardWidth * CARD_ASPECT;
  return {
    nameHeight: cardHeight * crop.nameBand,
    cardHeight,
    rulesHeight: cardHeight * crop.rulesBand,
  };
}

export function stackHeightFactor(crop: CardSliceCrop = SECONDARY_SLICE_CROP): number {
  return crop.nameBand + 1 + crop.rulesBand;
}

export function commanderWidthForHeight(
  availableHeight: number,
  maxWidth: number,
  stacked: boolean,
  crop: CardSliceCrop = SECONDARY_SLICE_CROP,
): number {
  const factor = stacked ? stackHeightFactor(crop) : 1;
  const fromHeight = Math.floor(availableHeight / (CARD_ASPECT * factor));
  return Math.max(280, Math.min(maxWidth, fromHeight));
}

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function dist(a: readonly [number, number, number], r: number, g: number, b: number): number {
  const dr = a[0] - r;
  const dg = a[1] - g;
  const db = a[2] - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

type RowStats = {
  lum: number;
  sd: number;
  darkFrac: number;
  mean: [number, number, number];
  rightLum: number;
};

function sampleRow(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  y: number,
  x0: number,
  x1: number,
  step: number,
  right0: number,
  right1: number,
): RowStats {
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let n = 0;
  let dark = 0;
  let rightSum = 0;
  let rightN = 0;
  const pixels: Array<[number, number, number]> = [];
  for (let x = x0; x < x1; x += step) {
    const i = (y * width + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    n += 1;
    pixels.push([r, g, b]);
    if (luma(r, g, b) < 40) dark += 1;
  }
  for (let x = right0; x < right1; x += step) {
    const i = (y * width + x) * 4;
    rightSum += luma(data[i], data[i + 1], data[i + 2]);
    rightN += 1;
  }
  const mean: [number, number, number] = [sumR / n, sumG / n, sumB / n];
  let varSum = 0;
  for (const [r, g, b] of pixels) {
    varSum += (r - mean[0]) ** 2 + (g - mean[1]) ** 2 + (b - mean[2]) ** 2;
  }
  return {
    lum: luma(mean[0], mean[1], mean[2]),
    sd: Math.sqrt(varSum / n),
    darkFrac: dark / n,
    mean,
    rightLum: rightN ? rightSum / rightN : 0,
  };
}

function medianColor(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  y0: number,
  y1: number,
  x0: number,
  x1: number,
): [number, number, number] {
  const samples: Array<[number, number, number, number]> = [];
  const yStep = Math.max(1, Math.floor((y1 - y0) / 24));
  const xStep = Math.max(1, Math.floor((x1 - x0) / 40));
  for (let y = y0; y < y1; y += yStep) {
    for (let x = x0; x < x1; x += xStep) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      samples.push([r, g, b, luma(r, g, b)]);
    }
  }
  if (samples.length === 0) return [220, 220, 210];
  samples.sort((a, b) => a[3] - b[3]);
  const mid = samples[samples.length >> 1];
  return [mid[0], mid[1], mid[2]];
}

function matchFracForRow(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  y: number,
  x0: number,
  x1: number,
  step: number,
  fill: readonly [number, number, number],
  thresh: number,
): number {
  let matched = 0;
  let n = 0;
  for (let x = x0; x < x1; x += step) {
    const i = (y * width + x) * 4;
    if (dist(fill, data[i], data[i + 1], data[i + 2]) <= thresh) matched += 1;
    n += 1;
  }
  return n ? matched / n : 0;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function detectNameBand(rows: RowStats[], height: number): { top: number; band: number } {
  const limit = Math.floor(height * 0.14);
  let y = 0;
  while (y < Math.floor(height * 0.08) && rows[y].lum < 40 && rows[y].darkFrac > 0.85) y += 1;

  let start = -1;
  for (let i = y; i < limit; i += 1) {
    if (rows[i].lum > 110 && rows[i].darkFrac < 0.4) {
      start = i;
      break;
    }
  }
  if (start < 0) {
    return { top: SECONDARY_SLICE_CROP.nameTop, band: SECONDARY_SLICE_CROP.nameBand };
  }

  const minEnd = start + Math.floor(height * 0.045);
  let end = start;
  for (let i = start; i < limit; i += 1) {
    const row = rows[i];
    const body = row.lum > 90 && row.darkFrac < 0.55;
    const earlyOutline = row.darkFrac > 0.65 && i - start < height * 0.04;
    if (body || earlyOutline) {
      end = i;
      continue;
    }
    if (i >= minEnd && row.lum < 130 && !earlyOutline) break;
    end = i;
  }

  const top = start / height;
  const bottom = (end + 1) / height;
  return { top, band: Math.max(0.05, bottom - top) };
}

/** Type line sits in a fixed band above the cream/gold textbox fill. */
const TYPE_LINE_BAND = 0.062;
/** Extra window below P/T or the DFC invert strip so rounded CSS crops keep the box. */
const RULES_BOTTOM_PAD = 0.008;
/** Collector numbers and artist credit start around 0.955 on Scryfall large frames. */
const RULES_BOTTOM_MAX = 0.946;
/** Right-edge luma that still counts as the gold P/T box (holofoil rows are dark in the center). */
const PT_RIGHT_LUMA = 95;

function detectRulesBand(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  rows: RowStats[],
  x0: number,
  x1: number,
  step: number,
): { top: number; band: number } {
  const fill = medianColor(
    data,
    width,
    height,
    Math.floor(height * 0.66),
    Math.floor(height * 0.8),
    Math.floor(width * 0.22),
    Math.floor(width * 0.78),
  );
  const thresh = Math.max(58, 0.28 * (luma(fill[0], fill[1], fill[2]) + 40));
  const matchAt = (y: number) => matchFracForRow(data, width, y, x0, x1, step, fill, thresh);

  const minY = Math.floor(height * 0.58);
  const maxY = Math.floor(height * RULES_BOTTOM_MAX);
  const core = Math.floor(height * 0.72);

  let top = core;
  let misses = 0;
  const gap = Math.max(2, Math.floor(height * 0.015));
  while (top > minY) {
    if (matchAt(top) > 0.28) {
      misses = 0;
      top -= 1;
      continue;
    }
    misses += 1;
    if (misses > gap) break;
    top -= 1;
  }
  top += misses;

  let bottom = core;
  let bottomMisses = 0;
  let sawPt = false;
  while (bottom < maxY) {
    const row = rows[bottom];
    const fillLike = matchAt(bottom) > 0.28;
    const ptLike = row.rightLum > PT_RIGHT_LUMA;
    const bannerLike = row.lum > 140 && row.darkFrac < 0.4;
    if (ptLike && row.lum < 80) sawPt = true;
    const gutter = row.darkFrac > 0.7 && row.lum < 50 && !ptLike;
    if (gutter) break;
    if (fillLike || ptLike || bannerLike) {
      bottomMisses = 0;
      bottom += 1;
      continue;
    }
    bottomMisses += 1;
    if (bottomMisses > gap) {
      bottom -= bottomMisses - 1;
      break;
    }
    bottom += 1;
  }

  let separator: number | null = null;
  const sepFrom = Math.floor(height * 0.605);
  const sepTo = Math.floor(height * 0.635);
  let darkest = 0;
  for (let y = sepFrom; y <= sepTo; y += 1) {
    const row = rows[y];
    if (row.lum < 80 && row.darkFrac > darkest) {
      darkest = row.darkFrac;
      separator = (y + 1) / height;
    }
  }
  const textboxTop = separator ?? top / height;
  const rulesTop = textboxTop - TYPE_LINE_BAND;
  const pad = sawPt ? RULES_BOTTOM_PAD : 0;
  const rulesBottom = Math.min(RULES_BOTTOM_MAX, bottom / height + pad);
  return { top: rulesTop, band: Math.max(0.3, rulesBottom - rulesTop) };
}

/** Read name-banner and type+textbox windows from a decoded card image. */
export function detectCardSlices(raster: PixelBuffer): CardSliceCrop {
  const { data, width, height } = raster;
  if (width < 24 || height < 24) return { ...SECONDARY_SLICE_CROP };

  const step = Math.max(1, Math.floor(width / 80));
  const x0 = Math.floor(width * 0.16);
  const x1 = Math.floor(width * 0.84);
  const right0 = Math.floor(width * 0.72);
  const right1 = Math.floor(width * 0.92);
  const rows: RowStats[] = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(sampleRow(data, width, y, x0, x1, step, right0, right1));
  }

  const name = detectNameBand(rows, height);
  const rules = detectRulesBand(data, width, height, rows, x0, x1, step);
  const nameTop = clamp(name.top, 0.015, 0.055);
  const nameBottom = clamp(name.top + name.band, nameTop + 0.05, 0.105);
  const rulesTop = clamp(rules.top, 0.548, 0.572);
  const rulesBottom = clamp(rules.top + rules.band, 0.91, RULES_BOTTOM_MAX);

  return {
    nameTop,
    nameBand: nameBottom - nameTop,
    rulesTop,
    rulesBand: rulesBottom - rulesTop,
  };
}

export async function detectSlicesFromUrl(url: string): Promise<CardSliceCrop> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return { ...SECONDARY_SLICE_CROP };
  }
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Card image failed to load."));
    img.src = url;
  });
  const width = 160;
  const height = Math.max(1, Math.round((160 * image.height) / image.width));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { ...SECONDARY_SLICE_CROP };
  ctx.drawImage(image, 0, 0, width, height);
  return detectCardSlices(ctx.getImageData(0, 0, width, height));
}
