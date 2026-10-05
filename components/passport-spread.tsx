/* Card images stay as plain <img> tags so the PNG export can inline them. */
/* eslint-disable @next/next/no-img-element */
import { bracketName } from "@/lib/bracket";
import { playstyleLabel, type Playstyle } from "@/lib/playstyle";
import type { ManaColor } from "@/lib/types";
import { displayUrl } from "@/lib/urls";

export const POSTER_WIDTH = 2000;
export const POSTER_HEIGHT = 1280;

const TYPE = "var(--font-typewriter), 'Courier New', Courier, monospace";
const INK = "#1a3148";
const PAPER = "#e7f2fc";
const FRAME = "#c9dff3";
const STAMP_INK = "rgba(30, 75, 122, 0.78)";
const STAMP_EDGE = "rgba(30, 75, 122, 0.34)";
const STAMP_FILL = "rgba(231, 242, 252, 0.14)";
const STAMP_HEX = "#1e4b7a";
const PLAY_INK = "rgba(16, 99, 48, 0.82)";
const PLAY_EDGE = "rgba(21, 122, 58, 0.38)";
const PLAY_FILL = "rgba(214, 242, 222, 0.16)";
const POWER_INK = "rgba(156, 43, 43, 0.78)";
const POWER_EDGE = "rgba(156, 43, 43, 0.36)";
const POWER_FILL = "rgba(252, 236, 236, 0.14)";
const POWER_HEX = "#9c2b2b";

const PIP_SRC: Record<ManaColor | "C", string> = {
  W: "/mana/W.svg",
  U: "/mana/U.svg",
  B: "/mana/B.svg",
  R: "/mana/R.svg",
  G: "/mana/G.svg",
  C: "/mana/C.svg",
};

const HERO_W = 522;
const HERO_H = 730;
const SPOT_W = 340;
const SPOT_H = 475;
const QR = 328;
const COMMANDER_SYMBOL = "c14";
const LEFT_COL = 740;
const COL_GAP = 8;
const TEXT_INSET = 72;

export type PassportHighlight = {
  name: string;
  imageUrl: string;
};

export type PassportSpreadProps = {
  deckName: string;
  commanderName?: string;
  partnerLine?: string;
  description?: string;
  colors: ManaColor[];
  showColorless?: boolean;
  heroImage?: string;
  heroName?: string;
  backImage?: string;
  backName?: string;
  showingBack?: boolean;
  highlights: PassportHighlight[];
  deckUrl?: string;
  qrDataUrl?: string;
  byline?: string;
  commanderDeck: boolean;
  bracket?: number | null;
  formatLabel: string;
  playstyles: Playstyle[];
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

function SetMark({ code, ink, size }: { code?: string; ink: string; size: number }) {
  if (!code) return null;
  return (
    <img
      alt=""
      src={symbolSrc(code, ink)}
      style={{ width: size, height: size, objectFit: "contain", flex: "0 0 auto", opacity: 0.8 }}
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

function DeckTypeStamp({ label, setCode }: { label: string; setCode?: string }) {
  const size = label.length > 14 ? 32 : label.length > 10 ? 40 : 48;
  return (
    <div
      style={{
        width: 640,
        height: 292,
        borderRadius: "50%",
        border: "8px solid " + STAMP_EDGE,
        color: STAMP_INK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-7deg)",
        background: STAMP_FILL,
        boxShadow: "inset 0 0 0 3px " + STAMP_EDGE,
        fontFamily: TYPE,
      }}
    >
      <div
        style={{
          width: 560,
          height: 220,
          borderRadius: "50%",
          border: "2px solid " + STAMP_EDGE,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "6px 28px",
          boxSizing: "border-box",
          gap: 6,
        }}
      >
        <div style={{ fontSize: 18, letterSpacing: "0.32em", lineHeight: 1, flex: "0 0 auto" }}>VISA</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flex: "0 0 auto" }}>
          <SetMark code={setCode} ink={STAMP_HEX} size={128} />
          <div style={{ fontSize: size, lineHeight: 0.95, maxWidth: 300, textAlign: "left", flex: "0 0 auto" }}>{label}</div>
        </div>
        <div style={{ fontSize: 18, letterSpacing: "0.2em", lineHeight: 1, flex: "0 0 auto" }}>ADMITTED</div>
      </div>
    </div>
  );
}

function PowerStamps({ count, caption }: { count: number; caption?: string }) {
  const rotations = [-16, -6, 9, -12, 4];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            style={{
              width: 112,
              height: 112,
              marginLeft: index === 0 ? 0 : -34,
              borderRadius: "50%",
              border: "3px solid " + POWER_EDGE,
              color: POWER_INK,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${rotations[index % rotations.length]}deg)`,
              background: POWER_FILL,
              boxShadow: "inset 0 0 0 1px " + POWER_EDGE,
              fontFamily: TYPE,
            }}
          >
            <SetMark code={COMMANDER_SYMBOL} ink={POWER_HEX} size={52} />
          </div>
        ))}
      </div>
      {caption ? (
        <div style={{ fontSize: 24, letterSpacing: "0.03em", color: POWER_INK }}>{caption}</div>
      ) : null}
    </div>
  );
}

function PlaystyleStamp({ styles }: { styles: Playstyle[] }) {
  const label = styles.length ? playstyleLabel(styles) : "CHOOSE";
  return (
    <div
      style={{
        width: 440,
        padding: "18px 20px 20px",
        border: "8px solid " + PLAY_EDGE,
        color: PLAY_INK,
        textAlign: "center",
        transform: "rotate(6deg)",
        background: PLAY_FILL,
        boxShadow: "inset 0 0 0 2px " + PLAY_EDGE,
        fontFamily: TYPE,
      }}
    >
      <div style={{ fontSize: 18, letterSpacing: "0.22em" }}>PLAYSTYLE</div>
      <div style={{ fontSize: label.length > 16 ? 32 : 42, lineHeight: 1.05, marginTop: 8 }}>{label}</div>
    </div>
  );
}

function MakerStamp() {
  return (
    <div
      style={{
        width: 468,
        height: 222,
        borderRadius: "50%",
        border: "7px solid " + STAMP_EDGE,
        color: STAMP_INK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(4deg)",
        background: STAMP_FILL,
        boxShadow: "inset 0 0 0 2px " + STAMP_EDGE,
        fontFamily: TYPE,
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          width: 400,
          height: 160,
          borderRadius: "50%",
          border: "2px solid " + STAMP_EDGE,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "4px 18px",
          boxSizing: "border-box",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 18, letterSpacing: "0.24em", lineHeight: 1, flex: "0 0 auto" }}>made by:</div>
        <div style={{ fontSize: 28, lineHeight: 1.05, flex: "0 0 auto" }}>MTG Deck Passport</div>
      </div>
    </div>
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
      <p
        style={{
          margin: "10px 0 0",
          width: "100%",
          fontSize: qrSize > 260 ? 28 : 22,
          lineHeight: 1.25,
          textAlign: "center",
          overflowWrap: "break-word",
        }}
      >
        {deckUrl ? displayUrl(deckUrl).replaceAll("/", "/\u200b") : "Deck link appears here"}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 16, letterSpacing: "0.08em" }}>No. {passportNo(deckUrl)}</p>
    </div>
  );
}

function PassportField({ label, value, size = 32, gap = 0 }: { label: string; value?: string; size?: number; gap?: number }) {
  return (
    <div style={{ marginTop: 10, marginBottom: gap, flexShrink: 0 }}>
      <p style={{ margin: 0, fontSize: 21, letterSpacing: "0.14em" }}>{label.toUpperCase()}</p>
      <p style={{ margin: "3px 0 0", fontSize: size, lineHeight: 1.18, whiteSpace: "pre-wrap" }}>{value?.trim() || "—"}</p>
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
  partnerLine,
  description,
  colors,
  showColorless = false,
  heroImage,
  heroName,
  backImage,
  backName,
  showingBack = false,
  highlights,
  deckUrl,
  qrDataUrl,
  byline,
  commanderDeck,
  bracket,
  formatLabel,
  playstyles,
  setCode,
  setName,
  endorsements,
}: PassportSpreadProps) {
  const pips = colors.length > 0 ? colors : showColorless ? (["C"] as const) : [];
  const credit = byline?.replace(/^by\s+/i, "").trim();
  const power = commanderDeck ? Math.max(0, Math.min(5, bracket ?? 0)) : 0;
  const shown = highlights.slice(0, 3);
  const rotations = [-1.4, 1.1, -0.7];
  const pinned = shown.length
    ? shown
    : [undefined, undefined, undefined].map(() => ({ name: undefined, imageUrl: undefined }));
  const dual = Boolean(backImage);
  const frontW = dual ? 418 : HERO_W;
  const frontH = dual ? 584 : HERO_H;
  const backW = 280;
  const backH = 392;
  const leftCol = dual ? frontW + 16 + backW + 12 : LEFT_COL;
  const textInset = dual ? 18 : TEXT_INSET;
  const rightWidth = POSTER_WIDTH - 16 * 2 - 18 * 2 - leftCol - COL_GAP - textInset;
  const titleSize = Math.max(42, Math.min(92, Math.floor((rightWidth - 8) / textUnits(deckName))));
  const notes = description?.trim() || "Type a short description of how this deck plays.";
  const notesSize = Math.max(34, Math.min(50, Math.round((rightWidth * 3.4) / textUnits(notes))));
  const makerCol = Math.max(520, rightWidth - 600);
  const levelLine =
    power > 0 ? `Level ${power} — ${bracketName(bracket) ?? "Unrated"}` : undefined;

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
          background: PAPER,
          borderRadius: 18,
          padding: "16px 18px 14px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: COL_GAP }}>
          <section style={{ width: leftCol, flex: "0 0 auto", display: "flex", flexDirection: "column", minHeight: 0, position: "relative", zIndex: 1 }}>
            {dual ? (
              <div style={{ position: "relative", height: 196, flex: "0 0 auto" }}>
                <div style={{ position: "absolute", left: 0, top: 8, transform: "scale(0.58)", transformOrigin: "top left" }}>
                  <DeckTypeStamp label={formatLabel.toUpperCase()} setCode={setCode} />
                </div>
                <div style={{ position: "absolute", left: 360, top: 36, transform: "scale(0.72)", transformOrigin: "top left" }}>
                  <PlaystyleStamp styles={playstyles} />
                </div>
              </div>
            ) : null}
            <div style={{ position: "relative", height: frontH, flex: "0 0 auto" }}>
              <div style={{ width: frontW, position: "relative", zIndex: 1 }}>
                {heroImage ? (
                  <img
                    alt={heroName ?? deckName}
                    src={mediaSrc(heroImage)}
                    style={{
                      width: frontW,
                      height: frontH,
                      objectFit: "cover",
                      borderRadius: 10,
                      background: "#d5e4f2",
                      boxShadow: "0 10px 22px rgba(26, 49, 72, 0.18)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: frontW,
                      height: frontH,
                      borderRadius: 10,
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
              {dual && backImage ? (
                <img
                  alt={backName || "Back face"}
                  src={mediaSrc(backImage)}
                  style={{
                    position: "absolute",
                    left: frontW + 16,
                    top: (frontH - backH) / 2,
                    width: backW,
                    height: backH,
                    objectFit: "cover",
                    borderRadius: 10,
                    background: "#d5e4f2",
                    boxShadow: "0 10px 22px rgba(26, 49, 72, 0.2)",
                    zIndex: 2,
                  }}
                />
              ) : null}
              {dual ? null : (
                <>
                  <div style={{ position: "absolute", left: HERO_W - 210, top: 70, zIndex: 2 }}>
                    <DeckTypeStamp label={formatLabel.toUpperCase()} setCode={setCode} />
                  </div>
                  <div style={{ position: "absolute", left: HERO_W - 110, top: 360, zIndex: 3 }}>
                    <PlaystyleStamp styles={playstyles} />
                  </div>
                  {power > 0 ? (
                    <div style={{ position: "absolute", left: HERO_W + 8, top: 524, zIndex: 4 }}>
                      <PowerStamps count={power} caption={levelLine} />
                    </div>
                  ) : null}
                </>
              )}
            </div>
            {dual && power > 0 ? (
              <div style={{ position: "relative", height: 136, flex: "0 0 auto", marginTop: 6 }}>
                <div style={{ position: "absolute", left: 0, top: 0, transform: "scale(0.66)", transformOrigin: "top left" }}>
                  <PowerStamps count={power} caption={levelLine} />
                </div>
              </div>
            ) : null}

            <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0, paddingTop: 8 }}>
              <DeckLink deckUrl={deckUrl} qrDataUrl={qrDataUrl} width={frontW} qrSize={dual ? (power > 0 ? 168 : 248) : QR} />
            </div>
          </section>

          <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative", zIndex: 2, paddingLeft: textInset }}>
            {pips.length > 0 ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {pips.map((color) => (
                  <img key={color} alt={color === "C" ? "Colorless" : color} src={PIP_SRC[color]} style={{ width: 42, height: 42 }} />
                ))}
              </div>
            ) : null}
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: rightWidth - makerCol - 12, flex: "0 0 auto", minWidth: 0 }}>
                <PassportField
                  label="Passport name"
                  value={
                    (showingBack ? (commanderName || heroName || "").split(" // ")[0]?.trim() : undefined) ||
                    commanderName ||
                    heroName ||
                    formatLabel
                  }
                  size={40}
                />
                {showingBack && backName ? <p style={{ margin: "2px 0 0", fontSize: 22 }}>{backName}</p> : null}
                {partnerLine ? <p style={{ margin: "2px 0 0", fontSize: 22 }}>{partnerLine}</p> : null}
                {credit ? <p style={{ margin: "2px 0 0", fontSize: 22 }}>Issued to {credit}</p> : null}
                <PassportField label="Place of birth" value={setName} size={40} />
                <PassportField label="Endorsements" value={endorsements} size={40} />
              </div>
              <div
                style={{
                  width: makerCol,
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MakerStamp />
              </div>
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
