"use client";

/* Card images stay as plain <img> tags so the PNG export can inline them. */
/* eslint-disable @next/next/no-img-element */
import { passportTypeLine } from "@/lib/bracket";
import {
  CARD_ASPECT,
  type CardSliceCrop,
  commanderWidthForHeight,
  detectSlicesFromUrl,
  nameObjectPositionY,
  rulesObjectPositionY,
  SECONDARY_SLICE_CROP,
  sliceHeightsForWidth,
} from "@/lib/card-crop";
import type { ManaColor } from "@/lib/types";
import { useEffect, useState, type ReactNode } from "react";

export const POSTER_WIDTH = 2000;
export const POSTER_HEIGHT = 1280;

const TYPE = "var(--font-typewriter), 'Courier New', Courier, monospace";
const INK = "#1a3148";
const PAPER = "#e7f2fc";
const FRAME = "#c9dff3";
const POWER_INK = "rgba(118, 28, 28, 0.96)";
const POWER_EDGE = "rgba(118, 28, 28, 0.9)";
const POWER_FILL = "rgba(252, 228, 228, 0.58)";
const POWER_HEX = "#8a2020";
const GOLD = "#7a5b12";
const GOLD_FILL = "#f6e3a1";
const GOLD_EDGE = "#5c430c";

const SPOT_W = 340;
const SPOT_H = 475;
const QR = 220;
const QR_COL = 320;
const SET_STAMP = 252;
const POWER_STAMP = 196;
const INFO_RESERVE = 1000;
const COMMANDER_SYMBOL = "c14";
const COL_GAP = 8;
const TEXT_INSET = 72;
const INNER_PAD_X = 18;
const VISA_SYMBOL = 216;
const ART_TOP_FRAC = 0.112;
const ART_BOTTOM_FRAC = 0.545;
const FULL_NAME_INDENT = 168;

const PAPER_TEXTURE = [
  "repeating-linear-gradient(90deg, rgba(28,58,88,0.04) 0px, rgba(28,58,88,0.04) 1px, transparent 1px, transparent 7px)",
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 1px, transparent 1px, transparent 5px)",
  "repeating-linear-gradient(24deg, transparent 0 9px, rgba(60,100,140,0.055) 9px 10px)",
  "repeating-linear-gradient(-21deg, transparent 0 12px, rgba(255,255,255,0.08) 12px 13px)",
  "repeating-radial-gradient(circle at 10px 7px, rgba(26,49,72,0.05) 0 0.55px, transparent 0.7px 11px)",
  "repeating-radial-gradient(circle at 17px 19px, rgba(90,60,40,0.028) 0 0.45px, transparent 0.65px 13px)",
  "radial-gradient(ellipse at 50% -8%, rgba(255,255,255,0.36), transparent 46%)",
  "linear-gradient(180deg, #eef6fc 0%, #e7f2fc 42%, #d7e6f3 100%)",
].join(", ");

const PAPER_NOISE = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.10  0 0 0 0 0.20  0 0 0 0 0.32  0 0 0 0.08 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

type StampSide = "left" | "right";

type ArtBox = {
  cardLeft: number;
  cardRight: number;
  artTop: number;
  artBottom: number;
};

type PlacedStamp = { left: number; top: number; size: number; rotate: number };

const PIP_STACK = [5, 2, 3, 4, 6];
const PIP_TURNS = [-16, 12, -8, 14, -12];
const POWER_TURNS = [-14, 10, -9, 12, -7];
const MIN_SEP = 0.84;

function jitterTurn(seed: string, index: number, base: number): number {
  const len = Math.max(seed.length, 1);
  const a = seed.charCodeAt(index % len);
  const b = seed.charCodeAt((index * 3 + 1) % len);
  return base + ((a + b + index * 23) % 21) - 10;
}

function artHeight(box: ArtBox): number {
  return Math.max(0, box.artBottom - box.artTop);
}

function fitStamp(box: ArtBox, size: number, countOnSide = 1): number {
  const height = artHeight(box);
  const packed = height / ((Math.max(1, countOnSide) - 1) * MIN_SEP + 1);
  return Math.min(size, Math.max(88, Math.min(height - 12, packed - 6)));
}

function stampLeft(box: ArtBox, size: number, side: StampSide, overlap: number): number {
  const onCard = Math.min(size - 32, Math.max(48, overlap));
  const hang = size - onCard;
  return side === "right"
    ? box.cardRight - onCard
    : box.cardLeft - Math.min(hang, Math.max(0, box.cardLeft - 6));
}

function clampStampTop(box: ArtBox, size: number, top: number): number {
  const maxTop = box.artBottom - size;
  return Math.min(Math.max(top, box.artTop), Math.max(box.artTop, maxTop));
}

type StampJob = {
  kind: "pip" | "power" | "set";
  index: number;
  size: number;
  prefer: StampSide;
  seedIndex: number;
  turn: number;
};

function layoutCommanderStamps(
  box: ArtBox,
  seed: string,
  pipCount: number,
  powerCount: number,
  hasSet: boolean,
): { pips: PlacedStamp[]; power: PlacedStamp[]; set?: PlacedStamp } {
  const jobs: StampJob[] = [];
  for (let index = 0; index < pipCount; index += 1) {
    jobs.push({
      kind: "pip",
      index,
      size: VISA_SYMBOL,
      prefer: index % 2 === 0 ? "right" : "left",
      seedIndex: index,
      turn: PIP_TURNS[index] ?? -8,
    });
  }
  for (let index = 0; index < powerCount; index += 1) {
    jobs.push({
      kind: "power",
      index,
      size: POWER_STAMP,
      prefer: index % 2 === 0 ? "left" : "right",
      seedIndex: index + 3,
      turn: POWER_TURNS[index] ?? -8,
    });
  }
  if (hasSet) {
    jobs.push({
      kind: "set",
      index: 0,
      size: SET_STAMP,
      prefer: "left",
      seedIndex: 8,
      turn: -18,
    });
  }

  const leftJobs: StampJob[] = [];
  const rightJobs: StampJob[] = [];
  for (const job of jobs) {
    const side =
      job.prefer === "right" && rightJobs.length > leftJobs.length
        ? "left"
        : job.prefer === "left" && leftJobs.length > rightJobs.length
          ? "right"
          : job.prefer;
    (side === "right" ? rightJobs : leftJobs).push(job);
  }

  type Occupied = PlacedStamp & { kind: StampJob["kind"]; index: number; side: StampSide; cx: number; cy: number; r: number };

  const occupied: Occupied[] = [];

  const placeGroup = (group: StampJob[], side: StampSide) => {
    const count = group.length;
    group.forEach((job, slot) => {
      const size = fitStamp(box, job.size, count);
      const travel = Math.max(0, artHeight(box) - size);
      const yFrac = count === 1 ? 0.38 : slot / Math.max(1, count - 1);
      const top = clampStampTop(box, size, box.artTop + yFrac * travel);
      const overlap = 54 + slot * 38 + (job.kind === "set" ? 10 : 0);
      const left = stampLeft(box, size, side, overlap);
      occupied.push({
        kind: job.kind,
        index: job.index,
        side,
        left,
        top,
        size,
        rotate: jitterTurn(seed, job.seedIndex, job.turn),
        cx: left + size / 2,
        cy: top + size / 2,
        r: size / 2,
      });
    });
  };

  placeGroup(leftJobs, "left");
  placeGroup(rightJobs, "right");

  for (let pass = 0; pass < 10; pass += 1) {
    let moved = false;
    for (let i = 0; i < occupied.length; i += 1) {
      for (let j = i + 1; j < occupied.length; j += 1) {
        const a = occupied[i];
        const b = occupied[j];
        const dx = b.cx - a.cx;
        const dy = b.cy - a.cy;
        const dist = Math.hypot(dx, dy) || 0.01;
        const min = (a.r + b.r) * MIN_SEP;
        if (dist >= min) continue;
        const push = (min - dist) / 2 + 1;
        const along = a.side === b.side || Math.abs(dx) < 36 ? (dy >= 0 ? 1 : -1) : dy / dist;
        a.top = clampStampTop(box, a.size, a.top - push * along);
        b.top = clampStampTop(box, b.size, b.top + push * along);
        a.cy = a.top + a.r;
        b.cy = b.top + b.r;
        moved = true;
      }
    }
    if (!moved) break;
  }

  const pips: PlacedStamp[] = [];
  const power: PlacedStamp[] = [];
  let set: PlacedStamp | undefined;
  for (const item of occupied) {
    const next = { left: item.left, top: item.top, size: item.size, rotate: item.rotate };
    if (item.kind === "pip") pips[item.index] = next;
    else if (item.kind === "power") power[item.index] = next;
    else set = next;
  }
  return { pips, power, set };
}

const PIP_SRC: Record<ManaColor | "C", string> = {
  W: "/mana/W.svg",
  U: "/mana/U.svg",
  B: "/mana/B.svg",
  R: "/mana/R.svg",
  G: "/mana/G.svg",
  C: "/mana/C.svg",
};

const CONTENT_WIDTH = POSTER_WIDTH - 16 * 2 - 18 * 2;
const CONTENT_HEIGHT = POSTER_HEIGHT - 16 * 2 - 16 - 14;
const LEFT_PAGE = CONTENT_WIDTH - INFO_RESERVE;

export type PassportHighlight = {
  name: string;
  imageUrl: string;
};

export type PassportSpreadProps = {
  deckName: string;
  commanderName?: string;
  aliasName?: string;
  companionName?: string;
  description?: string;
  colors: ManaColor[];
  showColorless?: boolean;
  heroImage?: string;
  heroName?: string;
  secondaryImage?: string;
  secondaryName?: string;
  secondaryIsBackFace?: boolean;
  highlights: PassportHighlight[];
  deckUrl?: string;
  qrDataUrl?: string;
  byline?: string;
  commanderDeck: boolean;
  bracket?: number | null;
  formatLabel: string;
  setCode?: string;
  setName?: string;
  endorsements?: string;
};

function mediaSrc(url?: string): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("/")) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function passportNo(url?: string): string {
  if (!url) return "00000000";
  let hash = 2166136261;
  for (const char of url) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 8);
}

function symbolSrc(code: string, ink: string): string {
  return `/api/set-symbol/${encodeURIComponent(code.toLowerCase())}?ink=${encodeURIComponent(ink)}`;
}

function SetMark({ code, ink, size, opaque = false }: { code?: string; ink: string; size: number; opaque?: boolean }) {
  if (!code) return null;
  return (
    <img
      alt=""
      src={symbolSrc(code, ink)}
      style={{ width: size, height: size, objectFit: "contain", flex: "0 0 auto", opacity: opaque ? 1 : 0.95 }}
      onError={(event) => {
        const stamp = event.currentTarget.closest("[data-set-stamp]");
        if (stamp instanceof HTMLElement) stamp.style.display = "none";
      }}
    />
  );
}

function textUnits(value: string): number {
  let units = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code > 0x2fff || (code >= 0x2600 && code <= 0x27bf)) units += 1.8;
    else if (char === " " || char === "." || char === "," || char === "'" || char === '"') units += 0.38;
    else if ("ilI!|".includes(char)) units += 0.34;
    else if ("mwMW".includes(char)) units += 0.86;
    else units += 0.62;
  }
  return Math.max(units, 1);
}

function SetSymbolStamp({ code, placed }: { code?: string; placed?: PlacedStamp }) {
  if (!code || !placed) return null;
  return (
    <div
      data-set-stamp=""
      style={{
        position: "absolute",
        left: placed.left,
        top: placed.top,
        width: placed.size,
        height: placed.size,
        borderRadius: "50%",
        border: "12px solid " + GOLD_EDGE,
        background: GOLD_FILL,
        boxShadow: "inset 0 0 0 5px " + GOLD_EDGE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `rotate(${placed.rotate}deg)`,
        zIndex: 2,
      }}
    >
      <SetMark code={code} ink={GOLD} size={Math.round(placed.size * 0.62)} opaque />
    </div>
  );
}

function VisaColorPips({
  colors,
  placements,
}: {
  colors: readonly (ManaColor | "C")[];
  placements: PlacedStamp[];
}) {
  if (colors.length === 0) return null;
  return (
    <>
      {colors.map((color, index) => {
        const placed = placements[index];
        if (!placed) return null;
        return (
          <img
            key={`${color}-${index}`}
            alt={color === "C" ? "Colorless" : color}
            src={PIP_SRC[color]}
            style={{
              position: "absolute",
              left: placed.left,
              top: placed.top,
              width: placed.size,
              height: placed.size,
              transform: `rotate(${placed.rotate}deg)`,
              zIndex: PIP_STACK[index] ?? index + 1,
            }}
          />
        );
      })}
    </>
  );
}

function PowerStamps({ placements }: { placements: PlacedStamp[] }) {
  return (
    <>
      {placements.map((placed, index) => {
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: placed.left,
              top: placed.top,
              width: placed.size,
              height: placed.size,
              borderRadius: "50%",
              border: "6px solid " + POWER_EDGE,
              color: POWER_INK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${placed.rotate}deg)`,
              background: POWER_FILL,
              boxShadow: "inset 0 0 0 3px " + POWER_EDGE,
              fontFamily: TYPE,
              zIndex: index + 1,
            }}
          >
            <SetMark code={COMMANDER_SYMBOL} ink={POWER_HEX} size={Math.round(placed.size * 0.52)} opaque />
          </div>
        );
      })}
    </>
  );
}

function useSliceCrop(src?: string): CardSliceCrop {
  const [crop, setCrop] = useState<CardSliceCrop>(SECONDARY_SLICE_CROP);
  useEffect(() => {
    if (!src) {
      setCrop(SECONDARY_SLICE_CROP);
      return;
    }
    let cancelled = false;
    const proxied = mediaSrc(src);
    detectSlicesFromUrl(proxied)
      .then((next) => {
        if (!cancelled) setCrop(next);
      })
      .catch(() => {
        if (!cancelled) setCrop(SECONDARY_SLICE_CROP);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return crop;
}

function CardNameSlice({
  src,
  width,
  height,
  crop,
}: {
  src: string;
  width: number;
  height: number;
  crop: CardSliceCrop;
}) {
  return (
    <img
      alt=""
      src={mediaSrc(src)}
      style={{
        display: "block",
        width,
        height,
        objectFit: "cover",
        objectPosition: `center ${nameObjectPositionY(crop)}`,
        borderRadius: "10px 10px 0 0",
        background: "#d5e4f2",
      }}
    />
  );
}

function CardRulesSlice({
  src,
  width,
  height,
  crop,
}: {
  src: string;
  width: number;
  height: number;
  crop: CardSliceCrop;
}) {
  return (
    <img
      alt=""
      src={mediaSrc(src)}
      style={{
        display: "block",
        width,
        height,
        objectFit: "cover",
        objectPosition: `center ${rulesObjectPositionY(crop)}`,
        borderRadius: "0 0 6px 6px",
        background: "#d5e4f2",
      }}
    />
  );
}

function DeckLink({
  deckUrl,
  qrDataUrl,
  width,
  qrSize,
}: {
  deckUrl?: string;
  qrDataUrl?: string;
  width: number;
  qrSize: number;
}) {
  return (
    <div style={{ width, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {qrDataUrl ? (
        <img
          alt="QR code linking to the deck"
          src={qrDataUrl}
          style={{ width: qrSize, height: qrSize, background: "#fff", borderRadius: 8 }}
        />
      ) : (
        <div
          style={{
            width: qrSize,
            height: qrSize,
            border: "1px dashed rgba(26,49,72,0.28)",
            borderRadius: 8,
          }}
        />
      )}
      <p style={{ margin: "8px 0 0", fontSize: 15, letterSpacing: "0.08em" }}>No. {passportNo(deckUrl)}</p>
    </div>
  );
}

function PassportField({
  label,
  value,
  size = 32,
  gap = 0,
  accessory,
  indent = 0,
}: {
  label: string;
  value?: string;
  size?: number;
  gap?: number;
  accessory?: ReactNode;
  indent?: number;
}) {
  const text = value?.trim() || "—";
  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: gap,
        marginLeft: indent,
        flexShrink: 0,
        display: "flex",
        alignItems: "baseline",
        gap: 14,
        minWidth: 0,
      }}
    >
      <p style={{ margin: 0, fontSize: 21, letterSpacing: "0.14em", flex: "0 0 auto", whiteSpace: "nowrap" }}>
        {label.toUpperCase()}
      </p>
      <div
        style={{
          margin: 0,
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          fontSize: size,
          lineHeight: 1.18,
        }}
      >
        {accessory}
        <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
      </div>
    </div>
  );
}

function PinnedCard({
  name,
  imageUrl,
  index,
  rotation,
}: {
  name?: string;
  imageUrl?: string;
  index: number;
  rotation: number;
}) {
  return (
    <figure
      style={{
        margin: 0,
        marginLeft: index === 0 ? 0 : -64,
        width: SPOT_W,
        position: "relative",
        zIndex: index + 1,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "46%",
          left: -16,
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "radial-gradient(circle at 32% 30%, #ffb4b4, #e02323 46%, #8d1010 78%)",
          boxShadow: "0 2px 3px rgba(26,49,72,0.35), inset 0 1px 1px rgba(255,255,255,0.75)",
          zIndex: 4,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "calc(46% + 12px)",
          left: 8,
          width: 22,
          height: 4,
          borderRadius: 2,
          background: "linear-gradient(180deg, #f4f6f8, #8e949b)",
          transform: "rotate(16deg)",
          zIndex: 3,
        }}
      />
      {imageUrl ? (
        <img
          alt={name ?? "Spotlight card"}
          src={mediaSrc(imageUrl)}
          style={{
            width: "100%",
            height: SPOT_H,
            objectFit: "cover",
            borderRadius: 8,
            background: "#d5e4f2",
            boxShadow: "0 10px 18px rgba(26, 49, 72, 0.18)",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: SPOT_H,
            borderRadius: 8,
            border: "1px dashed rgba(26,49,72,0.28)",
            background: "rgba(255,255,255,0.35)",
          }}
        />
      )}
      <figcaption style={{ marginTop: 8, textAlign: "center", fontSize: 18, lineHeight: 1.15 }}>
        {name ?? ""}
      </figcaption>
    </figure>
  );
}

export function PassportSpread({
  deckName,
  commanderName,
  aliasName,
  companionName,
  description,
  colors,
  showColorless = false,
  heroImage,
  heroName,
  secondaryImage,
  secondaryName,
  highlights,
  deckUrl,
  qrDataUrl,
  byline,
  commanderDeck,
  bracket,
  formatLabel,
  setCode,
  setName,
  endorsements,
}: PassportSpreadProps) {
  const pips = colors.length > 0 ? colors : showColorless ? (["C"] as const) : [];
  const credit = byline?.replace(/^by\s+/i, "").trim();
  const sliceCrop = useSliceCrop(secondaryImage);
  const power = commanderDeck ? Math.max(0, Math.min(5, bracket ?? 0)) : 0;
  const shown = highlights.slice(0, 3);
  const rotations = [-1.4, 1.1, -0.7];
  const pinned = shown.length
    ? shown
    : [undefined, undefined, undefined].map(() => ({ name: undefined, imageUrl: undefined }));
  const stacked = Boolean(secondaryImage);
  const commanderMaxW = stacked ? LEFT_PAGE - QR_COL - COL_GAP : LEFT_PAGE - 168;
  const frontW = commanderWidthForHeight(CONTENT_HEIGHT, commanderMaxW, stacked, sliceCrop);
  const frontH = Math.round(frontW * CARD_ASPECT);
  const sliceHeights = stacked ? sliceHeightsForWidth(frontW, sliceCrop) : null;
  const stackH = stacked && sliceHeights ? sliceHeights.nameHeight + frontH + sliceHeights.rulesHeight : frontH;
  const cardTop = Math.max(0, Math.round((CONTENT_HEIGHT - stackH) / 2));
  const cardLeft = stacked ? 0 : Math.round((LEFT_PAGE - frontW) / 2);
  const rightWidth = CONTENT_WIDTH - LEFT_PAGE - TEXT_INSET;
  const titleSize = Math.max(42, Math.min(92, Math.floor((rightWidth - 8) / textUnits(deckName))));
  const notes = description?.trim() || "Type a short description of how this deck plays.";
  const fieldColWidth = Math.max(280, rightWidth - QR - 24);
  const notesSize = Math.max(34, Math.min(50, Math.round((rightWidth * 3.4) / textUnits(notes))));
  const commanderLabel = commanderName || heroName;
  const fullName = commanderLabel
    ? commanderLabel.split(" // ")[0]?.trim() || commanderLabel
    : formatLabel;
  const aliasValue = aliasName?.trim() || "none";
  const companionValue = companionName?.trim() || "none";
  const passportType = passportTypeLine(bracket) ?? "—";
  const fieldSize = (value: string | undefined, max = 40) =>
    Math.max(28, Math.min(max, Math.floor((fieldColWidth - 200) / textUnits(value?.trim() || "—"))));
  const stampSeed = passportNo(deckUrl);
  const creaseLeft = INNER_PAD_X + LEFT_PAGE - 22;
  const heroTop = cardTop + (stacked && sliceHeights ? sliceHeights.nameHeight : 0);
  const artBox: ArtBox = {
    cardLeft,
    cardRight: cardLeft + frontW,
    artTop: heroTop + Math.round(frontH * ART_TOP_FRAC),
    artBottom: heroTop + Math.round(frontH * ART_BOTTOM_FRAC),
  };
  const stampLayout = layoutCommanderStamps(artBox, stampSeed, pips.length, power, Boolean(setCode));

  return (
    <article
      style={{
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        boxSizing: "border-box",
        padding: 16,
        display: "flex",
        background: FRAME,
        fontFamily: TYPE,
        color: INK,
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          backgroundColor: PAPER,
          backgroundImage: PAPER_TEXTURE,
          borderRadius: 18,
          padding: "16px 18px 14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          boxShadow: "inset 0 0 48px rgba(26,49,72,0.08)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 18,
            pointerEvents: "none",
            zIndex: 0,
            opacity: 0.42,
            backgroundImage: PAPER_NOISE,
            backgroundSize: "160px 160px",
            mixBlendMode: "multiply",
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: creaseLeft,
            width: 52,
            pointerEvents: "none",
            zIndex: 4,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(26,49,72,0.06) 26%, rgba(18,40,64,0.26) 47%, rgba(255,255,255,0.5) 50%, rgba(18,40,64,0.24) 54%, rgba(26,49,72,0.06) 76%, transparent 100%)",
          }}
        />
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "stretch", gap: COL_GAP }}>
          <section
            style={{
              width: LEFT_PAGE,
              flex: "0 0 auto",
              minHeight: 0,
              position: "relative",
              zIndex: 3,
              overflow: "visible",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: cardLeft,
                top: cardTop,
                width: frontW,
                zIndex: 1,
              }}
            >
              {stacked && secondaryImage && sliceHeights ? (
                <CardNameSlice
                  src={secondaryImage}
                  width={frontW}
                  height={sliceHeights.nameHeight}
                  crop={sliceCrop}
                />
              ) : null}
              <div style={{ position: "relative", width: frontW }}>
                {heroImage ? (
                  <img
                    alt={heroName ?? deckName}
                    src={mediaSrc(heroImage)}
                    style={{
                      width: frontW,
                      height: frontH,
                      objectFit: "cover",
                      borderRadius: stacked ? 0 : 10,
                      background: "#d5e4f2",
                      boxShadow: stacked ? "none" : "0 10px 22px rgba(26, 49, 72, 0.18)",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: frontW,
                      height: frontH,
                      borderRadius: stacked ? 0 : 10,
                      border: "1px dashed rgba(26,49,72,0.35)",
                      display: "flex",
                      alignItems: "flex-end",
                      boxSizing: "border-box",
                      padding: 16,
                      color: "#5d7590",
                    }}
                  >
                    {heroName ?? "Commander"}
                  </div>
                )}
              </div>
              {stacked && secondaryImage && sliceHeights ? (
                <CardRulesSlice
                  src={secondaryImage}
                  width={frontW}
                  height={sliceHeights.rulesHeight}
                  crop={sliceCrop}
                />
              ) : null}
              {stacked ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 10,
                    boxShadow: "0 10px 22px rgba(26, 49, 72, 0.18)",
                    pointerEvents: "none",
                  }}
                />
              ) : null}
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 5,
                pointerEvents: "none",
              }}
            >
              <VisaColorPips colors={pips} placements={stampLayout.pips} />
              {power > 0 ? <PowerStamps placements={stampLayout.power} /> : null}
              {setCode ? <SetSymbolStamp code={setCode} placed={stampLayout.set} /> : null}
            </div>
          </section>

          <section
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              position: "relative",
              zIndex: 2,
              paddingLeft: TEXT_INSET,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 8,
                minHeight: 42,
              }}
            >
              {pips.length > 0
                ? pips.map((color) => (
                    <img
                      key={color}
                      alt={color === "C" ? "Colorless" : color}
                      src={PIP_SRC[color]}
                      style={{ width: 42, height: 42, flex: "0 0 auto" }}
                    />
                  ))
                : null}
              {credit ? <p style={{ margin: 0, fontSize: 22 }}>Issued to {credit}</p> : null}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: titleSize,
                lineHeight: 0.98,
                fontWeight: 400,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {deckName}
            </h2>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 20, minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PassportField label="Full name" value={fullName} size={fieldSize(fullName)} />
                <PassportField
                  label="Alias"
                  value={aliasValue}
                  size={fieldSize(aliasValue)}
                  indent={FULL_NAME_INDENT}
                />
                <PassportField
                  label="Birth city"
                  value={setName}
                  size={fieldSize(setName)}
                  accessory={setCode ? <SetMark code={setCode} ink={INK} size={36} opaque /> : undefined}
                />
                <PassportField label="Passport type" value={passportType} size={fieldSize(passportType, 34)} />
                <PassportField label="Companion" value={companionValue} size={fieldSize(companionValue)} />
                <PassportField label="Endorsements" value={endorsements} size={fieldSize(endorsements, 34)} />
              </div>
              <DeckLink deckUrl={deckUrl} qrDataUrl={qrDataUrl} width={QR} qrSize={QR} />
            </div>
            <PassportField label="Notes" value={notes} size={notesSize} gap={14} />

            <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", marginTop: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 22, letterSpacing: "0.16em" }}>SPOTLIGHT CARDS</p>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                {pinned.map((card, index) => (
                  <PinnedCard
                    key={`${card?.name ?? "empty"}-${index}`}
                    name={card?.name}
                    imageUrl={card?.imageUrl}
                    index={index}
                    rotation={rotations[index] ?? 0}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}