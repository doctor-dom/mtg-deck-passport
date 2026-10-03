/* Poster images stay as plain <img> tags so the PNG export can inline them. */
/* eslint-disable @next/next/no-img-element */
import { formatAverage } from "@/lib/mana-curve";
import type { ManaColor } from "@/lib/types";
import { displayUrl } from "@/lib/urls";

export const POSTER_WIDTH = 1080;
export const POSTER_HEIGHT = 1440;

const PIP_SRC: Record<ManaColor | "C", string> = {
  W: "/mana/W.svg",
  U: "/mana/U.svg",
  B: "/mana/B.svg",
  R: "/mana/R.svg",
  G: "/mana/G.svg",
  C: "/mana/C.svg",
};

export type PosterHighlight = {
  name: string;
  imageUrl: string;
};

export type SpotlightPosterProps = {
  className?: string;
  kicker: string;
  byline?: string;
  deckName: string;
  subtitle: string;
  partnerLine?: string;
  description?: string;
  colors: ManaColor[];
  heroImage?: string;
  heroName?: string;
  artUrl?: string;
  buckets: number[];
  average: number;
  highlights: PosterHighlight[];
  deckUrl?: string;
  qrDataUrl?: string;
};

function mediaSrc(url?: string): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("/")) return url;
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function titleSize(name: string): number {
  if (name.length > 42) return 40;
  if (name.length > 32) return 46;
  if (name.length > 22) return 54;
  return 64;
}

export function SpotlightPoster({
  className,
  kicker,
  byline,
  deckName,
  subtitle,
  partnerLine,
  description,
  colors,
  heroImage,
  heroName,
  artUrl,
  buckets,
  average,
  highlights,
  deckUrl,
  qrDataUrl,
}: SpotlightPosterProps) {
  const pips = colors.length > 0 ? colors : (["C"] as const);
  const maxBucket = Math.max(1, ...buckets);
  const credit = byline?.replace(/^by\s+/i, "").trim();

  return (
    <article
      className={className}
      style={{
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        position: "relative",
        overflow: "hidden",
        color: "#f4f7fb",
        background: "#070b14",
        fontFamily: "var(--font-outfit), Outfit, sans-serif",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "#070b14" }} />
      {artUrl ? (
        <img
          alt=""
          src={mediaSrc(artUrl)}
          style={{
            position: "absolute",
            width: "145%",
            height: "78%",
            left: "-22%",
            top: "-8%",
            objectFit: "cover",
            objectPosition: "center",
            opacity: 0.5,
            filter: "saturate(1.2)",
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(7,11,20,0.2) 0%, rgba(7,11,20,0.55) 28%, rgba(7,11,20,0.9) 58%, rgba(7,11,20,0.97) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "34px 36px 30px",
          boxSizing: "border-box",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 650,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#d5deea",
            }}
          >
            {kicker}
          </p>
          {credit ? (
            <p style={{ margin: 0, fontSize: 16, color: "#c5d0df" }}>by {credit}</p>
          ) : null}
        </header>

        <section style={{ display: "flex", gap: 28, marginTop: 22, alignItems: "center" }}>
          {heroImage ? (
            <img
              alt={heroName ?? deckName}
              src={mediaSrc(heroImage)}
              style={{
                width: 286,
                height: 399,
                objectFit: "cover",
                borderRadius: 14,
                boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
                flex: "0 0 auto",
                background: "#111827",
              }}
            />
          ) : (
            <div
              style={{
                width: 286,
                height: 399,
                borderRadius: 14,
                flex: "0 0 auto",
                border: "1px dashed rgba(255,255,255,0.28)",
                display: "flex",
                alignItems: "flex-end",
                padding: 18,
                boxSizing: "border-box",
                color: "#9aabc0",
                fontSize: 16,
                background: "rgba(8,12,22,0.35)",
              }}
            >
              {heroName ?? "Spotlight card"}
            </div>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {pips.map((color) => (
                <img
                  key={color}
                  alt={color === "C" ? "Colorless" : color}
                  src={PIP_SRC[color]}
                  style={{ width: 34, height: 34 }}
                />
              ))}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: titleSize(deckName),
                lineHeight: 0.98,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                textWrap: "balance",
              }}
            >
              {deckName}
            </h2>
            <p style={{ margin: "12px 0 0", fontSize: 24, fontWeight: 560, color: "#e7eef6" }}>
              {subtitle}
            </p>
            {partnerLine ? (
              <p style={{ margin: "4px 0 0", fontSize: 16, color: "#b7c4d4" }}>{partnerLine}</p>
            ) : null}
            {description ? (
              <p
                style={{
                  margin: "16px 0 0",
                  fontSize: 20,
                  lineHeight: 1.35,
                  color: "#d5deea",
                  display: "-webkit-box",
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {description}
              </p>
            ) : null}
          </div>
        </section>

        <section
          style={{
            marginTop: 26,
            background: "rgba(12, 18, 32, 0.78)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 18,
            padding: "14px 18px 12px",
            display: "flex",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#9aabc0",
                fontWeight: 650,
              }}
            >
              Mana curve
            </p>
            <div
              style={{
                marginTop: 10,
                height: 78,
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 10,
                alignItems: "end",
              }}
            >
              {buckets.map((count, index) => (
                <div
                  key={index}
                  style={{
                    height: count === 0 ? 3 : Math.max(10, (count / maxBucket) * 78),
                    borderRadius: "7px 7px 3px 3px",
                    background:
                      count === 0
                        ? "rgba(255,255,255,0.08)"
                        : "linear-gradient(180deg, #d9fff8 0%, #5ef0d8 42%, #14b8a6 100%)",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                marginTop: 6,
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 10,
                color: "#93a4ba",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {["0", "1", "2", "3", "4", "5", "6", "7+"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
          <div style={{ width: 108, textAlign: "right", alignSelf: "center" }}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#93a4ba",
                fontWeight: 650,
              }}
            >
              Avg MV
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 42,
                lineHeight: 1,
                fontWeight: 700,
                color: "#7ef3e0",
              }}
            >
              {formatAverage(average)}
            </p>
          </div>
        </section>

        {highlights.length > 0 ? (
          <section style={{ marginTop: 26 }}>
            <p
              style={{
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 18,
                fontWeight: 650,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: "#7ef3e0",
                  transform: "rotate(45deg)",
                  display: "inline-block",
                }}
              />
              Card highlights
            </p>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "center",
                gap: 22,
              }}
            >
              {highlights.slice(0, 3).map((card) => (
                <figure key={`${card.name}-${card.imageUrl}`} style={{ margin: 0, width: 250 }}>
                  <img
                    alt={card.name}
                    src={mediaSrc(card.imageUrl)}
                    style={{
                      width: "100%",
                      height: 349,
                      objectFit: "cover",
                      borderRadius: 12,
                      boxShadow: "0 14px 30px rgba(0,0,0,0.4)",
                      background: "#111827",
                    }}
                  />
                  <figcaption
                    style={{
                      marginTop: 10,
                      textAlign: "center",
                      fontSize: 16,
                      fontWeight: 650,
                      lineHeight: 1.25,
                    }}
                  >
                    {card.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        <footer
          style={{
            marginTop: "auto",
            paddingTop: 22,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            {qrDataUrl ? (
              <img
                alt="QR code linking to the deck"
                src={qrDataUrl}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 12,
                  background: "#fff",
                  flex: "0 0 auto",
                }}
              />
            ) : (
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 12,
                  border: "1px dashed rgba(255,255,255,0.25)",
                  flex: "0 0 auto",
                }}
              />
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Explore the full deck</p>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 14,
                  color: "#9aabc0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 520,
                }}
              >
                {deckUrl ? displayUrl(deckUrl) : "Deck link appears here"}
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 650 }}>Made with Deck Spotlight</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#93a4ba" }}>
              Moxfield · Archidekt · ManaBox
            </p>
          </div>
        </footer>
      </div>
    </article>
  );
}
