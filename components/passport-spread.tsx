/* Card images stay as plain <img> tags so the PNG export can inline them. */
/* eslint-disable @next/next/no-img-element */
import { bracketName } from "@/lib/bracket";
import { formatAverage } from "@/lib/mana-curve";
import { playstyleLabel, type Playstyle } from "@/lib/playstyle";
import type { ManaColor } from "@/lib/types";
import { displayUrl } from "@/lib/urls";

export const POSTER_WIDTH = 1720;
export const POSTER_HEIGHT = 1040;

const TYPE = "var(--font-typewriter), 'Courier New', Courier, monospace";
const INK = "#2a2118";
const PAPER = "#f4ecd9";
const RULE = "rgba(42, 33, 24, 0.18)";

const PIP_SRC: Record<ManaColor | "C", string> = {
  W: "/mana/W.svg",
  U: "/mana/U.svg",
  B: "/mana/B.svg",
  R: "/mana/R.svg",
  G: "/mana/G.svg",
  C: "/mana/C.svg",
};

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

function VisaStamp({ lines }: { lines: string[] }) {
  return (
    <div
      style={{
        width: 214,
        height: 214,
        borderRadius: "50%",
        border: "4px solid #9c2b2b",
        color: "#9c2b2b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-14deg)",
        background: "rgba(244, 236, 217, 0.2)",
        boxShadow: "inset 0 0 0 2px #9c2b2b, 0 8px 18px rgba(80, 20, 20, 0.12)",
        fontFamily: TYPE,
      }}
    >
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: "50%",
          border: "2px solid #9c2b2b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "22px 18px",
          boxSizing: "border-box",
          gap: 6,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.24em", lineHeight: 1, flex: "0 0 auto" }}>VISA</div>
        {lines.map((line) => (
          <div
            key={line}
            style={{
              fontSize: line.length <= 2 ? 28 : line.length > 12 ? 13 : 16,
              lineHeight: 1.05,
              letterSpacing: line.length <= 2 ? "0.08em" : "0.04em",
              flex: "0 0 auto",
              maxWidth: 132,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlaystyleStamp({ styles }: { styles: Playstyle[] }) {
  const label = styles.length ? playstyleLabel(styles) : "CHOOSE";
  return (
    <div
      style={{
        minWidth: 210,
        padding: "10px 16px 12px",
        border: "4px solid #1e4b7a",
        color: "#1e4b7a",
        textAlign: "center",
        transform: "rotate(8deg)",
        background: "rgba(244, 236, 217, 0.35)",
        boxShadow: "inset 0 0 0 2px #1e4b7a",
        fontFamily: TYPE,
      }}
    >
      <div style={{ fontSize: 12, letterSpacing: "0.2em" }}>PLAYSTYLE</div>
      <div style={{ fontSize: label.length > 16 ? 16 : 22, lineHeight: 1.1, marginTop: 4 }}>{label}</div>
    </div>
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
  const visaLines = commanderDeck
    ? ["BRACKET", bracket ? String(bracket) : "—", (bracketName(bracket) ?? "UNSET").toUpperCase()]
    : [formatLabel.toUpperCase(), "ADMITTED"];
  const shown = highlights.slice(0, 3);

  return (
    <article
      style={{
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        boxSizing: "border-box",
        padding: 22,
        display: "flex",
        background:
          "radial-gradient(circle at 20% 0%, #4a3022 0%, #2a1b12 42%, #1a100c 100%)",
        fontFamily: TYPE,
        color: INK,
      }}
    >
      <section
        style={{
          flex: 1,
          minWidth: 0,
          background: PAPER,
          borderRadius: "16px 6px 6px 16px",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.4)",
          padding: "26px 28px 22px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <p style={{ margin: 0, letterSpacing: "0.18em", fontSize: 18 }}>DECK PASSPORT</p>
          <p style={{ margin: 0, fontSize: 14, letterSpacing: "0.08em" }}>No. {passportNo(deckUrl)}</p>
        </header>
        <div style={{ height: 1, background: RULE, margin: "10px 0 16px" }} />

        <div style={{ display: "flex", gap: 22, alignItems: "flex-start", minHeight: 0 }}>
          <div style={{ position: "relative", width: 268, flex: "0 0 auto" }}>
            {heroImage ? (
              <img
                alt={heroName ?? deckName}
                src={mediaSrc(heroImage)}
                style={{
                  width: 268,
                  height: 374,
                  objectFit: "cover",
                  borderRadius: 8,
                  background: "#d9d0bc",
                  boxShadow: "0 10px 24px rgba(42, 33, 24, 0.18)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 268,
                  height: 374,
                  borderRadius: 8,
                  border: "1px dashed rgba(42,33,24,0.35)",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: 14,
                  boxSizing: "border-box",
                  fontSize: 16,
                  color: "#6d6254",
                }}
              >
                {heroName ?? "Commander"}
              </div>
            )}
            <div style={{ position: "absolute", right: -18, bottom: 28 }}>
              <VisaStamp lines={visaLines} />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
            {pips.length > 0 ? (
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {pips.map((color) => (
                  <img
                    key={color}
                    alt={color === "C" ? "Colorless" : color}
                    src={PIP_SRC[color]}
                    style={{ width: 26, height: 26 }}
                  />
                ))}
              </div>
            ) : null}
            <h2
              style={{
                margin: 0,
                fontSize: deckName.length > 28 ? 30 : 36,
                lineHeight: 1.05,
                fontWeight: 400,
                letterSpacing: "-0.02em",
              }}
            >
              {deckName}
            </h2>
            <p style={{ margin: "14px 0 0", fontSize: 16, lineHeight: 1.35 }}>
              {commanderDeck ? commanderName || "Commander" : formatLabel}
              {showingBack ? " · back face" : ""}
            </p>
            {partnerLine ? (
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "#5c5146" }}>{partnerLine}</p>
            ) : null}
            {credit ? (
              <p style={{ margin: "10px 0 0", fontSize: 14, color: "#5c5146" }}>Issued to {credit}</p>
            ) : null}
          </div>
        </div>

        <section style={{ marginTop: "auto", paddingTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <p style={{ margin: 0, fontSize: 14, letterSpacing: "0.16em" }}>CMC BREAKDOWN</p>
            <p style={{ margin: 0, fontSize: 16 }}>AVG {formatAverage(average)}</p>
          </div>
          <div
            style={{
              marginTop: 10,
              height: 72,
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 8,
              alignItems: "end",
            }}
          >
            {buckets.map((count, index) => (
              <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 12, color: "#5c5146" }}>{count}</span>
                <div
                  style={{
                    width: "100%",
                    height: count === 0 ? 3 : Math.max(8, (count / maxBucket) * 48),
                    background: count === 0 ? "rgba(42,33,24,0.15)" : "#1e4b7a",
                    borderRadius: 2,
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
              fontSize: 13,
              color: "#5c5146",
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
          width: 28,
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.28), rgba(255,255,255,0.08) 45%, rgba(0,0,0,0.35))",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-evenly",
          alignItems: "center",
        }}
      >
        {Array.from({ length: 7 }, (_, index) => (
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
          borderRadius: "6px 16px 16px 6px",
          padding: "26px 28px 22px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <p style={{ margin: 0, letterSpacing: "0.18em", fontSize: 18 }}>NOTES</p>
          <p style={{ margin: 0, fontSize: 14 }}>{commanderDeck ? "Commander" : formatLabel}</p>
        </header>
        <div style={{ height: 1, background: RULE, margin: "10px 0 14px" }} />

        <div style={{ position: "relative", minHeight: 168 }}>
          <div style={{ position: "absolute", top: 8, right: 0 }}>
            <PlaystyleStamp styles={playstyles} />
          </div>
          <p
            style={{
              margin: 0,
              maxWidth: "68%",
              fontSize: 20,
              lineHeight: 1.45,
              minHeight: 116,
              whiteSpace: "pre-wrap",
            }}
          >
            {description || "Type a short description of how this deck plays."}
          </p>
        </div>

        <section style={{ marginTop: 8 }}>
          <p style={{ margin: "0 0 12px", fontSize: 14, letterSpacing: "0.16em" }}>SPOTLIGHT CARDS</p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, minHeight: 292 }}>
            {shown.length > 0
              ? shown.map((card) => (
                  <figure key={`${card.name}-${card.imageUrl}`} style={{ margin: 0, width: 188 }}>
                    <img
                      alt={card.name}
                      src={mediaSrc(card.imageUrl)}
                      style={{
                        width: "100%",
                        height: 262,
                        objectFit: "cover",
                        borderRadius: 6,
                        background: "#d9d0bc",
                        boxShadow: "0 8px 16px rgba(42, 33, 24, 0.16)",
                      }}
                    />
                    <figcaption
                      style={{
                        marginTop: 8,
                        textAlign: "center",
                        fontSize: 13,
                        lineHeight: 1.25,
                      }}
                    >
                      {card.name}
                    </figcaption>
                  </figure>
                ))
              : [0, 1, 2].map((slot) => (
                  <div
                    key={slot}
                    style={{
                      width: 188,
                      height: 262,
                      borderRadius: 6,
                      border: "1px dashed rgba(42,33,24,0.28)",
                    }}
                  />
                ))}
          </div>
        </section>

        <footer
          style={{
            marginTop: "auto",
            paddingTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14 }}>Explore the full deck</p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 12,
                color: "#5c5146",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 460,
              }}
            >
              {deckUrl ? displayUrl(deckUrl) : "Deck link appears here"}
            </p>
          </div>
          {qrDataUrl ? (
            <img
              alt="QR code linking to the deck"
              src={qrDataUrl}
              style={{ width: 64, height: 64, background: "#fff", borderRadius: 4, flex: "0 0 auto" }}
            />
          ) : (
            <div style={{ width: 64, height: 64, border: "1px dashed rgba(42,33,24,0.28)", flex: "0 0 auto" }} />
          )}
        </footer>
      </section>
    </article>
  );
}
