/* Card images stay as plain <img> tags so the PNG export can inline them. */
/* eslint-disable @next/next/no-img-element */
import { bracketName } from "@/lib/bracket";
import { formatAverage } from "@/lib/mana-curve";
import { playstyleLabel, type Playstyle } from "@/lib/playstyle";
import type { ManaColor } from "@/lib/types";
import { displayUrl } from "@/lib/urls";

export const POSTER_WIDTH = 2160;
export const POSTER_HEIGHT = 940;

const TYPE = "var(--font-typewriter), 'Courier New', Courier, monospace";
const INK = "#2a2118";
const PAPER = "#f4ecd9";
const RULE = "rgba(42, 33, 24, 0.2)";

const PIP_SRC: Record<ManaColor | "C", string> = {
  W: "/mana/W.svg",
  U: "/mana/U.svg",
  B: "/mana/B.svg",
  R: "/mana/R.svg",
  G: "/mana/G.svg",
  C: "/mana/C.svg",
};

const HERO_W = 360;
const HERO_H = 503;
const SPOT_W = 400;
const SPOT_H = 558;

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
  buckets: number[];
  average: number;
  highlights: PassportHighlight[];
  deckUrl?: string;
  qrDataUrl?: string;
  byline?: string;
  commanderDeck: boolean;
  bracket?: number | null;
  formatLabel: string;
  playstyles: Playstyle[];
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

function DeckTypeStamp({ label }: { label: string }) {
  const size = label.length > 14 ? 28 : label.length > 10 ? 36 : 46;
  return (
    <div
      style={{
        width: 640,
        height: 268,
        borderRadius: "50%",
        border: "8px solid #1e4b7a",
        color: "#1e4b7a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-7deg)",
        background: "rgba(244, 236, 217, 0.62)",
        boxShadow: "inset 0 0 0 3px #1e4b7a",
        fontFamily: TYPE,
      }}
    >
      <div
        style={{
          width: 560,
          height: 196,
          borderRadius: "50%",
          border: "2px solid #1e4b7a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "8px 36px",
          boxSizing: "border-box",
          gap: 6,
        }}
      >
        <div style={{ fontSize: 16, letterSpacing: "0.32em", lineHeight: 1, flex: "0 0 auto" }}>VISA</div>
        <div style={{ fontSize: size, lineHeight: 1, maxWidth: 460, flex: "0 0 auto" }}>{label}</div>
        <div style={{ fontSize: 16, letterSpacing: "0.2em", lineHeight: 1, flex: "0 0 auto" }}>ADMITTED</div>
      </div>
    </div>
  );
}

function PowerStamps({ count, caption }: { count: number; caption?: string }) {
  const rotations = [-18, -7, 8, -12, 4];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            style={{
              width: 84,
              height: 84,
              marginLeft: index === 0 ? 0 : -30,
              borderRadius: "50%",
              border: "3px solid #9c2b2b",
              color: "#9c2b2b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: `rotate(${rotations[index % rotations.length]}deg)`,
              background: "rgba(244, 236, 217, 0.72)",
              boxShadow: "inset 0 0 0 1px #9c2b2b",
              fontFamily: TYPE,
              fontSize: 13,
              letterSpacing: "0.12em",
              lineHeight: 1,
            }}
          >
            PWR
          </div>
        ))}
      </div>
      {caption ? (
        <div style={{ fontSize: 13, letterSpacing: "0.14em", color: "#9c2b2b" }}>{caption}</div>
      ) : null}
    </div>
  );
}

function PlaystyleStamp({ styles }: { styles: Playstyle[] }) {
  const label = styles.length ? playstyleLabel(styles) : "CHOOSE";
  return (
    <div
      style={{
        width: 320,
        padding: "18px 18px 20px",
        border: "7px solid #1e4b7a",
        color: "#1e4b7a",
        textAlign: "center",
        transform: "rotate(7deg)",
        background: "rgba(244, 236, 217, 0.55)",
        boxShadow: "inset 0 0 0 3px #1e4b7a",
        fontFamily: TYPE,
      }}
    >
      <div style={{ fontSize: 16, letterSpacing: "0.24em" }}>PLAYSTYLE</div>
      <div style={{ fontSize: label.length > 16 ? 26 : 34, lineHeight: 1.05, marginTop: 8 }}>{label}</div>
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
        marginLeft: index === 0 ? 0 : -90,
        width: SPOT_W,
        position: "relative",
        zIndex: index + 1,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 16,
          left: `${46 + index * 4}%`,
          width: 26,
          height: 26,
          marginLeft: -13,
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #f6e7a8, #b0892e 55%, #6d5314 80%)",
          boxShadow: "0 2px 2px rgba(42,33,24,0.4), inset 0 1px 1px rgba(255,255,255,0.7)",
          zIndex: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 24,
          left: "50%",
          width: 128,
          height: 32,
          marginLeft: -64,
          background: "linear-gradient(180deg, rgba(255,248,214,0.35), rgba(226,204,132,0.72))",
          border: "1px solid rgba(168, 142, 70, 0.35)",
          transform: "rotate(-2deg)",
          zIndex: 2,
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
            borderRadius: 4,
            background: "#d9d0bc",
            boxShadow: "0 10px 18px rgba(42, 33, 24, 0.22)",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: SPOT_H,
            borderRadius: 4,
            border: "1px dashed rgba(42,33,24,0.28)",
            background: "rgba(255,255,255,0.25)",
          }}
        />
      )}
      <figcaption style={{ marginTop: 6, textAlign: "center", fontSize: 16, lineHeight: 1.15, minHeight: 20 }}>
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
  buckets,
  average,
  highlights,
  deckUrl,
  qrDataUrl,
  byline,
  commanderDeck,
  bracket,
  formatLabel,
  playstyles,
}: PassportSpreadProps) {
  const pips = colors.length > 0 ? colors : showColorless ? (["C"] as const) : [];
  const maxBucket = Math.max(1, ...buckets);
  const credit = byline?.replace(/^by\s+/i, "").trim();
  const power = commanderDeck ? Math.max(0, Math.min(5, bracket ?? 0)) : 0;
  const shown = highlights.slice(0, 3);
  const rotations = [-1.6, 1.3, -0.8];
  const pinned = shown.length
    ? shown
    : [undefined, undefined, undefined].map(() => ({ name: undefined, imageUrl: undefined }));

  return (
    <article
      style={{
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        boxSizing: "border-box",
        display: "flex",
        background: "radial-gradient(circle at 18% 0%, #4a3022 0%, #2a1b12 46%, #1a100c 100%)",
        fontFamily: TYPE,
        color: INK,
        padding: 12,
      }}
    >
      <section
        style={{
          flex: 1,
          minWidth: 0,
          background: PAPER,
          borderRadius: "14px 4px 4px 14px",
          padding: "12px 14px 8px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p style={{ margin: 0, letterSpacing: "0.16em", fontSize: 18 }}>DECK PASSPORT</p>
          <p style={{ margin: 0, fontSize: 14 }}>No. {passportNo(deckUrl)}</p>
        </header>
        <div style={{ height: 1, background: RULE, margin: "8px 0 10px" }} />

        <div style={{ display: "flex", gap: 14, alignItems: "stretch", position: "relative" }}>
          <div style={{ width: HERO_W, flex: "0 0 auto", position: "relative", zIndex: 1 }}>
            {heroImage ? (
              <img
                alt={heroName ?? deckName}
                src={mediaSrc(heroImage)}
                style={{
                  width: HERO_W,
                  height: HERO_H,
                  objectFit: "cover",
                  borderRadius: 6,
                  background: "#d9d0bc",
                  boxShadow: "0 8px 18px rgba(42, 33, 24, 0.2)",
                }}
              />
            ) : (
              <div
                style={{
                  width: HERO_W,
                  height: HERO_H,
                  borderRadius: 6,
                  border: "1px dashed rgba(42,33,24,0.35)",
                  display: "flex",
                  alignItems: "flex-end",
                  boxSizing: "border-box",
                  padding: 14,
                  color: "#6d6254",
                }}
              >
                {heroName ?? "Commander"}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 2, paddingTop: 2 }}>
            {pips.length > 0 ? (
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {pips.map((color) => (
                  <img key={color} alt={color === "C" ? "Colorless" : color} src={PIP_SRC[color]} style={{ width: 28, height: 28 }} />
                ))}
              </div>
            ) : null}
            <h2
              style={{
                margin: 0,
                fontSize: deckName.length > 32 ? 28 : 34,
                lineHeight: 1.02,
                fontWeight: 400,
              }}
            >
              {deckName}
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 16, lineHeight: 1.25 }}>
              {commanderDeck ? commanderName || "Commander" : formatLabel}
              {showingBack ? " · back face" : ""}
            </p>
            {partnerLine ? <p style={{ margin: "4px 0 0", fontSize: 14 }}>{partnerLine}</p> : null}
            {credit ? <p style={{ margin: "4px 0 0", fontSize: 14 }}>Issued to {credit}</p> : null}

            <div style={{ position: "absolute", left: -58, top: 152, zIndex: 2 }}>
              <DeckTypeStamp label={formatLabel.toUpperCase()} />
            </div>
            {power > 0 ? (
              <div style={{ position: "absolute", right: 28, bottom: 108, zIndex: 3 }}>
                <PowerStamps count={power} caption={bracketName(bracket)?.toUpperCase()} />
              </div>
            ) : null}
          </div>
        </div>

        <section style={{ marginTop: 2, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <p style={{ margin: 0, fontSize: 18, letterSpacing: "0.16em" }}>CMC BREAKDOWN</p>
            <p style={{ margin: 0, fontSize: 24 }}>AVG {formatAverage(average)}</p>
          </div>
          <div
            style={{
              marginTop: 6,
              flex: 1,
              minHeight: 220,
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            {buckets.map((count, index) => (
              <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", minHeight: 0 }}>
                <div style={{ flex: count === 0 ? 1 : Math.max(0, maxBucket - count), minHeight: 0 }} />
                <span style={{ flex: "0 0 auto", fontSize: 18, lineHeight: 1, marginBottom: 6 }}>{count}</span>
                <div
                  style={{
                    width: "100%",
                    flex: count === 0 ? "0 0 6px" : `${Math.max(count, 0.35)} 1 0`,
                    minHeight: count === 0 ? 6 : 20,
                    background: count === 0 ? "rgba(42,33,24,0.16)" : "#1e4b7a",
                    borderRadius: 3,
                  }}
                />
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 6,
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              textAlign: "center",
              fontSize: 16,
            }}
          >
            {["0", "1", "2", "3", "4", "5", "6", "7+"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </section>
      </section>

      <div
        style={{
          width: 22,
          background: "linear-gradient(90deg, rgba(0,0,0,0.28), rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.35))",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
          alignItems: "center",
        }}
      >
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#c8b89a",
              boxShadow: "0 0 0 2px rgba(42,33,24,0.35)",
            }}
          />
        ))}
      </div>

      <section
        style={{
          flex: 1,
          minWidth: 0,
          background: PAPER,
          borderRadius: "4px 14px 14px 4px",
          padding: "12px 14px 8px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <p style={{ margin: 0, letterSpacing: "0.16em", fontSize: 18 }}>NOTES</p>
          <p style={{ margin: 0, fontSize: 14 }}>{formatLabel}</p>
        </header>
        <div style={{ height: 1, background: RULE, margin: "8px 0 10px" }} />

        <div style={{ position: "relative", minHeight: 132 }}>
          <div style={{ position: "absolute", top: -4, right: -4 }}>
            <PlaystyleStamp styles={playstyles} />
          </div>
          <p
            style={{
              margin: 0,
              maxWidth: 560,
              fontSize: 24,
              lineHeight: 1.28,
              whiteSpace: "pre-wrap",
            }}
          >
            {description || "Type a short description of how this deck plays."}
          </p>
        </div>

        <section style={{ marginTop: 4, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <p style={{ margin: "0 0 4px", fontSize: 16, letterSpacing: "0.16em" }}>SPOTLIGHT CARDS</p>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
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
        </section>

        <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 2 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15 }}>Explore the full deck</p>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 520,
              }}
            >
              {deckUrl ? displayUrl(deckUrl) : "Deck link appears here"}
            </p>
          </div>
          {qrDataUrl ? (
            <img
              alt="QR code linking to the deck"
              src={qrDataUrl}
              style={{ width: 72, height: 72, background: "#fff", borderRadius: 4, flex: "0 0 auto" }}
            />
          ) : (
            <div style={{ width: 72, height: 72, border: "1px dashed rgba(42,33,24,0.28)", flex: "0 0 auto" }} />
          )}
        </footer>
      </section>
    </article>
  );
}
