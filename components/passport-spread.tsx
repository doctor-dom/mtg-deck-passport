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
const STAMP_INK = "#1e4b7a";
const STAMP_FILL = "rgba(231, 242, 252, 0.78)";

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
const SPOT_W = 372;
const SPOT_H = 520;
const QR = 280;
const COMMANDER_SYMBOL = "c14";

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
      style={{ width: size, height: size, objectFit: "contain", flex: "0 0 auto" }}
    />
  );
}

function DeckTypeStamp({ label, setCode }: { label: string; setCode?: string }) {
  const size = label.length > 14 ? 28 : label.length > 10 ? 36 : 44;
  return (
    <div
      style={{
        width: 448,
        height: 214,
        borderRadius: "50%",
        border: "7px solid " + STAMP_INK,
        color: STAMP_INK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-8deg)",
        background: STAMP_FILL,
        boxShadow: "inset 0 0 0 3px " + STAMP_INK,
        fontFamily: TYPE,
      }}
    >
      <div
        style={{
          width: 390,
          height: 164,
          borderRadius: "50%",
          border: "2px solid " + STAMP_INK,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "4px 28px",
          boxSizing: "border-box",
          gap: 4,
        }}
      >
        <div style={{ fontSize: 16, letterSpacing: "0.28em", lineHeight: 1, flex: "0 0 auto" }}>VISA</div>
        <SetMark code={setCode} ink={STAMP_INK} size={40} />
        <div style={{ fontSize: size, lineHeight: 1, maxWidth: 330, flex: "0 0 auto" }}>{label}</div>
        <div style={{ fontSize: 16, letterSpacing: "0.18em", lineHeight: 1, flex: "0 0 auto" }}>ADMITTED</div>
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
              width: 78,
              height: 78,
              marginLeft: index === 0 ? 0 : -26,
              borderRadius: "50%",
              border: "3px solid #9c2b2b",
              color: "#9c2b2b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${rotations[index % rotations.length]}deg)`,
              background: STAMP_FILL,
              boxShadow: "inset 0 0 0 1px #9c2b2b",
              fontFamily: TYPE,
            }}
          >
            <SetMark code={COMMANDER_SYMBOL} ink="#9c2b2b" size={36} />
          </div>
        ))}
      </div>
      {caption ? (
        <div style={{ fontSize: 20, letterSpacing: "0.04em", color: "#9c2b2b" }}>{caption}</div>
      ) : null}
    </div>
  );
}

function PlaystyleStamp({ styles }: { styles: Playstyle[] }) {
  const label = styles.length ? playstyleLabel(styles) : "CHOOSE";
  return (
    <div
      style={{
        width: 300,
        padding: "12px 14px 14px",
        border: "6px solid " + STAMP_INK,
        color: STAMP_INK,
        textAlign: "center",
        transform: "rotate(6deg)",
        background: STAMP_FILL,
        boxShadow: "inset 0 0 0 2px " + STAMP_INK,
        fontFamily: TYPE,
      }}
    >
      <div style={{ fontSize: 16, letterSpacing: "0.22em" }}>PLAYSTYLE</div>
      <div style={{ fontSize: label.length > 16 ? 26 : 34, lineHeight: 1.05, marginTop: 6 }}>{label}</div>
    </div>
  );
}

function PassportField({ label, value, size = 32 }: { label: string; value?: string; size?: number }) {
  return (
    <div style={{ marginTop: 12, flexShrink: 0 }}>
      <p style={{ margin: 0, fontSize: 18, letterSpacing: "0.14em" }}>{label.toUpperCase()}</p>
      <p style={{ margin: "3px 0 0", fontSize: size, lineHeight: 1.2, whiteSpace: "pre-wrap" }}>{value?.trim() || "—"}</p>
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
  const titleSize = deckName.length > 34 ? 60 : deckName.length > 22 ? 74 : 88;
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
        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 18 }}>
          <section style={{ width: 900, flex: "0 0 auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ position: "relative", height: HERO_H }}>
              <div style={{ width: HERO_W, position: "relative", zIndex: 1 }}>
                {heroImage ? (
                  <img
                    alt={heroName ?? deckName}
                    src={mediaSrc(heroImage)}
                    style={{
                      width: HERO_W,
                      height: HERO_H,
                      objectFit: "cover",
                      borderRadius: 10,
                      background: "#d5e4f2",
                      boxShadow: "0 10px 22px rgba(26, 49, 72, 0.18)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: HERO_W,
                      height: HERO_H,
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
              <div style={{ position: "absolute", left: HERO_W - 96, top: 12, zIndex: 2 }}>
                <DeckTypeStamp label={formatLabel.toUpperCase()} setCode={setCode} />
              </div>
              <div style={{ position: "absolute", left: HERO_W - 20, top: 248, zIndex: 3 }}>
                <PlaystyleStamp styles={playstyles} />
              </div>
              {power > 0 ? (
                <div style={{ position: "absolute", left: 630, top: 468, zIndex: 4, maxWidth: 250 }}>
                  <PowerStamps count={power} caption={levelLine} />
                </div>
              ) : null}
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 18, minHeight: 0, paddingTop: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 48, lineHeight: 1 }}>DECK PASSPORT</p>
                <p style={{ margin: "8px 0 0", fontSize: 20, letterSpacing: "0.08em" }}>No. {passportNo(deckUrl)}</p>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 18,
                    lineHeight: 1.3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {deckUrl ? displayUrl(deckUrl) : "Deck link appears here"}
                </p>
              </div>
              {qrDataUrl ? (
                <img
                  alt="QR code linking to the deck"
                  src={qrDataUrl}
                  style={{ width: QR, height: QR, background: "#fff", borderRadius: 8, flex: "0 0 auto" }}
                />
              ) : (
                <div
                  style={{
                    width: QR,
                    height: QR,
                    border: "1px dashed rgba(26,49,72,0.28)",
                    borderRadius: 8,
                    flex: "0 0 auto",
                  }}
                />
              )}
            </div>
          </section>

          <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
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
              }}
            >
              {deckName}
            </h2>
            <PassportField label="Passport name" value={commanderName || heroName || formatLabel} />
            {showingBack ? <p style={{ margin: "2px 0 0", fontSize: 18 }}>Back face</p> : null}
            {partnerLine ? <p style={{ margin: "2px 0 0", fontSize: 18 }}>{partnerLine}</p> : null}
            {credit ? <p style={{ margin: "2px 0 0", fontSize: 18 }}>Issued to {credit}</p> : null}
            <PassportField label="Place of birth" value={setName} />
            <PassportField label="Endorsements" value={endorsements} />
            <PassportField
              label="Notes"
              value={description || "Type a short description of how this deck plays."}
              size={28}
            />

            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: 0, paddingTop: 18 }}>
              <p style={{ margin: "0 0 8px", fontSize: 20, letterSpacing: "0.16em" }}>SPOTLIGHT CARDS</p>
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
