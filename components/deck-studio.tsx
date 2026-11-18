"use client";

import { ThemePicker } from "@/components/theme-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BRACKETS } from "@/lib/bracket";
import type { Theme } from "@/lib/themes";
import { endorsementsFromThemes } from "@/lib/themes";
import { defaultPrintingId, printingOptionLabel } from "@/lib/printings";
import type { DeckCard, NormalizedDeck, ResolvedPrinting } from "@/lib/types";
import { slugify } from "@/lib/urls";
import { domToPng } from "modern-screenshot";
import { useEffect, useMemo, useRef, useState } from "react";
import { PassportSpread, POSTER_HEIGHT, POSTER_WIDTH } from "./passport-spread";

const SAMPLES = [
  {
    source: "Archidekt",
    url: "https://archidekt.com/decks/7368845/kaalia_of_the_vast_edh_commander",
  },
  {
    source: "ManaBox",
    url: "https://manabox.app/decks/4ZHzry4jQJ6yFB0qEo1RmA",
  },
  {
    source: "Moxfield",
    url: "https://moxfield.com/decks/iqi_GNHNpUyJVPyWltrPHg",
  },
];

type SpotlightChoice = {
  card?: DeckCard;
  printings: ResolvedPrinting[];
  selectedId: string;
  loading: boolean;
  error?: string;
};

type CommanderChoice = {
  card: DeckCard;
  printings: ResolvedPrinting[];
  selectedId: string;
  loading: boolean;
  error?: string;
};

type SecondaryChoice = "none" | "partner" | "back";

const EMPTY_SPOTLIGHT: SpotlightChoice = {
  printings: [],
  selectedId: "",
  loading: false,
};

const EMPTY_SPOTLIGHTS: SpotlightChoice[] = [EMPTY_SPOTLIGHT, EMPTY_SPOTLIGHT, EMPTY_SPOTLIGHT];

function spotlightCardKey(card: DeckCard): string {
  return `${card.name}\0${card.set ?? ""}\0${card.collectorNumber ?? ""}`;
}

function SpotlightPicker({
  cards,
  onPick,
}: {
  cards: DeckCard[];
  onPick: (card: DeckCard) => void;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!normalized) return cards;
    return cards.filter((card) => {
      const haystack = `${card.name} ${card.set ?? ""} ${card.collectorNumber ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [cards, normalized]);

  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">Add from this deck</span>
      <Input
        value={query}
        placeholder="Search cards…"
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search cards in this deck"
        {...{ onValueChange: setQuery }}
      />
      <div className="max-h-52 overflow-y-auto rounded-lg border border-border p-2">
        <div className="grid gap-1">
          {visible.length === 0 ? (
            <p className="px-2 py-1 text-sm text-muted-foreground">No cards match that search.</p>
          ) : (
            visible.map((card) => (
              <button
                key={spotlightCardKey(card)}
                type="button"
                className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/60"
                onClick={() => onPick(card)}
              >
                {card.name}
                {card.set ? ` (${card.set.toUpperCase()})` : ""}
              </button>
            ))
          )}
        </div>
      </div>
    </label>
  );
}

function cardCount(deck: NormalizedDeck): number {
  return [...deck.commanders, ...deck.cards].reduce((sum, card) => sum + card.quantity, 0);
}

export function DeckStudio() {
  const [url, setUrl] = useState("");
  const [deck, setDeck] = useState<NormalizedDeck | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [byline, setByline] = useState("");
  const [spotlights, setSpotlights] = useState<SpotlightChoice[]>(EMPTY_SPOTLIGHTS);
  const [commanders, setCommanders] = useState<CommanderChoice[]>([]);
  const [faceIndex, setFaceIndex] = useState(0);
  const [bracket, setBracket] = useState<number | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [secondaryChoice, setSecondaryChoice] = useState<SecondaryChoice>("none");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [scale, setScale] = useState(0.42);
  const frameRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const secondaryAutoRef = useRef<string | null>(null);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(() => {
      setScale(Math.min(1, frame.clientWidth / POSTER_WIDTH));
    });
    observer.observe(frame);
    setScale(Math.min(1, frame.clientWidth / POSTER_WIDTH));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!deck) return;
    let cancelled = false;
    deck.commanders.forEach((card, index) => {
      void fetch(`/api/cards/printings?name=${encodeURIComponent(card.name)}`)
        .then(async (response) => {
          const data = (await response.json()) as {
            printings?: ResolvedPrinting[];
            error?: string;
          };
          if (cancelled) return;
          setCommanders((current) =>
            current.map((entry, entryIndex) => {
              if (entryIndex !== index) return entry;
              const printings = data.printings ?? [];
              return {
                ...entry,
                loading: false,
                error: response.ok ? undefined : data.error,
                printings,
                selectedId: defaultPrintingId(printings, entry.card),
              };
            }),
          );
        })
        .catch(() => {
          if (cancelled) return;
          setCommanders((current) =>
            current.map((entry, entryIndex) =>
              entryIndex === index
                ? { ...entry, loading: false, error: "Printings could not be loaded." }
                : entry,
            ),
          );
        });
    });
    return () => {
      cancelled = true;
    };
  }, [deck]);

  useEffect(() => {
    if (!deck) return;
    if (secondaryAutoRef.current === deck.url) return;
    if (commanders.some((entry) => entry.loading)) return;
    const entry = commanders[faceIndex] ?? commanders[0];
    const printing = entry?.printings.find((item) => item.id === entry.selectedId);
    const hasPartner = commanders.length > 1;
    if (!printing?.backImageUrl && !hasPartner) return;
    secondaryAutoRef.current = deck.url;
    if (printing?.backImageUrl) setSecondaryChoice("back");
    else if (hasPartner) setSecondaryChoice("partner");
  }, [deck, commanders, faceIndex]);

  useEffect(() => {
    const entry = commanders[faceIndex] ?? commanders[0];
    const printing = entry?.printings.find((item) => item.id === entry.selectedId);
    const hasPartner = commanders.length > 1;
    setSecondaryChoice((current) => {
      if (current === "back" && !printing?.backImageUrl) {
        return hasPartner ? "partner" : "none";
      }
      if (current === "partner" && !hasPartner) {
        return printing?.backImageUrl ? "back" : "none";
      }
      return current;
    });
  }, [commanders, faceIndex]);

  async function loadDeck(nextUrl: string) {
    const target = nextUrl.trim();
    if (!target) return;
    setUrl(target);
    setLoading(true);
    setLoadError(null);
    setExportError(null);
    try {
      const response = await fetch("/api/deck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await response.json()) as { deck?: NormalizedDeck; error?: string };
      if (!response.ok || !data.deck) {
        throw new Error(data.error ?? "That deck could not be read.");
      }
      setDeck(data.deck);
      setByline(data.deck.author ?? "");
      setDescription("");
      setSpotlights(EMPTY_SPOTLIGHTS.map((slot) => ({ ...slot })));
      setFaceIndex(0);
      setBracket(data.deck.bracket ?? null);
      setThemes([]);
      setSecondaryChoice("none");
      secondaryAutoRef.current = null;
      setCommanders(
        data.deck.commanders.map((card) => ({
          card,
          printings: [],
          selectedId: "",
          loading: true,
        })),
      );
    } catch (error) {
      setDeck(null);
      setCommanders([]);
      setLoadError(error instanceof Error ? error.message : "That deck could not be read.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSpotlightPrintings(index: number, card: DeckCard) {
    try {
      const response = await fetch(`/api/cards/printings?name=${encodeURIComponent(card.name)}`);
      const data = (await response.json()) as { printings?: ResolvedPrinting[]; error?: string };
      setSpotlights((current) =>
        current.map((slot, slotIndex) => {
          if (slotIndex !== index || slot.card?.name !== card.name) return slot;
          const printings = data.printings ?? [];
          return {
            ...slot,
            loading: false,
            error: response.ok ? undefined : data.error,
            printings,
            selectedId: defaultPrintingId(printings, card),
          };
        }),
      );
    } catch {
      setSpotlights((current) =>
        current.map((slot, slotIndex) =>
          slotIndex === index && slot.card?.name === card.name
            ? { ...slot, loading: false, error: "Printings could not be loaded." }
            : slot,
        ),
      );
    }
  }

  function assignSpotlight(card: DeckCard) {
    setSpotlights((current) => {
      const empty = current.findIndex((slot) => !slot.card);
      const target = empty === -1 ? current.length - 1 : empty;
      void loadSpotlightPrintings(target, card);
      return current.map((slot, index) =>
        index === target
          ? { card, printings: [], selectedId: "", loading: true, error: undefined }
          : slot,
      );
    });
  }

  function clearSpotlight(index: number) {
    setSpotlights((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...EMPTY_SPOTLIGHT } : slot)),
    );
  }

  const face = commanders[faceIndex] ?? commanders[0];
  const facePrinting = face?.printings.find((printing) => printing.id === face.selectedId);
  const resolvedSpotlights = spotlights
    .map((slot) => {
      const printing = slot.printings.find((item) => item.id === slot.selectedId);
      if (!printing) return null;
      return printing;
    })
    .filter((card): card is ResolvedPrinting => card != null);
  const firstSpotlight = resolvedSpotlights[0];
  const hasCommander = (deck?.commanders.length ?? 0) > 0;
  const commanderDeck = deck?.spotlightKind === "commander";
  const heroPrinting = hasCommander ? facePrinting : firstSpotlight;
  const heroFallback = hasCommander ? face?.card : undefined;
  const faceIdx = commanders[faceIndex] ? faceIndex : 0;
  const otherCommanders = commanders.filter((_, index) => index !== faceIdx);
  const partnerChoice = otherCommanders[0];
  const partnerPrinting = partnerChoice?.printings.find((printing) => printing.id === partnerChoice.selectedId);
  const partnerImage = partnerPrinting?.imageUrl || partnerChoice?.card.imageUrl;
  const backImageUrl = facePrinting?.backImageUrl;
  const secondaryImage =
    secondaryChoice === "back" && backImageUrl
      ? backImageUrl
      : secondaryChoice === "partner" && partnerImage
        ? partnerImage
        : undefined;
  const secondaryName =
    secondaryChoice === "back" && backImageUrl
      ? facePrinting?.backName
      : secondaryChoice === "partner" && partnerImage
        ? partnerChoice?.card.name
        : undefined;
  const secondaryIsBackFace = secondaryChoice === "back" && Boolean(backImageUrl);
  const aliasName =
    otherCommanders.length > 0 ? otherCommanders.map((entry) => entry.card.name).join(" & ") : undefined;
  const highlights = resolvedSpotlights.map((card) => ({
    name: card.name,
    imageUrl: card.imageUrl,
  }));
  const suggestions = useMemo(() => {
    if (!deck) return [];
    const seen = new Set<string>();
    return [...deck.commanders, ...deck.cards]
      .filter((card) => {
        const key = `${card.name}|${card.set ?? ""}|${card.collectorNumber ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [deck]);

  const poster = (
    <PassportSpread
      deckName={deck?.name ?? "Your next deck"}
      commanderName={hasCommander ? face?.card.name : undefined}
      aliasName={deck && hasCommander ? aliasName : undefined}
      companionName={deck?.companion?.name}
      description={
        description ||
        (deck ? undefined : "A short line about how the deck plays, typed across the notes page.")
      }
      colors={deck?.colorIdentity ?? []}
      showColorless={deck != null && deck.colorIdentity.length === 0}
      heroImage={heroPrinting?.imageUrl ?? heroFallback?.imageUrl}
      heroName={heroPrinting?.name ?? heroFallback?.name ?? firstSpotlight?.name}
      secondaryImage={secondaryImage}
      secondaryName={secondaryName}
      secondaryIsBackFace={secondaryIsBackFace}
      highlights={highlights}
      deckUrl={deck?.url}
      qrDataUrl={deck?.qrDataUrl}
      byline={byline}
      commanderDeck={Boolean(deck && commanderDeck)}
      bracket={bracket}
      formatLabel={deck?.formatLabel ?? "Deck"}
      setCode={heroPrinting?.set}
      setName={heroPrinting?.setName}
      endorsements={endorsementsFromThemes(themes)}
    />
  );

  async function downloadPoster() {
    const node = posterRef.current;
    if (!node || !deck) return;
    setExporting(true);
    setExportError(null);
    try {
      await document.fonts.ready;
      const dataUrl = await domToPng(node, {
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        scale: 2,
        backgroundColor: "#c9dff3",
        style: { transform: "none", transformOrigin: "top left" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${slugify(deck.name) || "deck"}-passport.png`;
      link.click();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The poster could not be saved.");
    } finally {
      setExporting(false);
    }
  }

  const slowSource = /moxfield\.com/i.test(url);

  return (
    <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[minmax(0,760px)_minmax(0,1fr)] lg:px-6">
      <section className="grid min-w-0 content-start gap-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
            Deck Passport
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            Turn a deck link into an open passport.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Paste a Moxfield, Archidekt, or ManaBox deck. The commander grows to use the left column;
            the QR code always sits in the center gutter at full size. A secondary commander or back
            face shows as cropped bands above and below a smaller commander. Pick up to three deck
            themes for endorsements and up to three spotlight cards from the list with printing
            dropdowns.
          </p>
        </div>

        <form
          className="grid min-w-0 gap-3 rounded-2xl border border-border bg-card/80 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void loadDeck(url);
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="deck-url">Deck link</Label>
            <Input
              id="deck-url"
              value={url}
              placeholder="https://moxfield.com/decks/…"
              onChange={(event) => setUrl(event.target.value)}
              {...{ onValueChange: setUrl }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((sample) => (
              <Button
                key={sample.url}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadDeck(sample.url)}
              >
                Try {sample.source}
              </Button>
            ))}
          </div>
          <Button type="submit" disabled={loading || !url.trim()} className="h-10">
            {loading ? (slowSource ? "Reading Moxfield…" : "Reading deck…") : "Load deck"}
          </Button>
          {loadError ? (
            <p role="alert" className="text-sm text-destructive">
              {loadError}
            </p>
          ) : null}
        </form>

        {deck ? (
          <div className="grid min-w-0 gap-5 rounded-2xl border border-border bg-card/80 p-4">
            <div>
              <p className="text-lg font-semibold">{deck.name}</p>
              <p className="text-sm text-muted-foreground">
                {deck.formatLabel} · {cardCount(deck)} cards · {deck.sourceLabel}
              </p>
              <a
                className="mt-1 block truncate text-sm text-primary underline-offset-4 hover:underline"
                href={deck.url}
                target="_blank"
                rel="noreferrer"
              >
                {deck.url.replace(/^https?:\/\//, "")}
              </a>
              {deck.warnings.map((warning) => (
                <p key={warning} className="mt-2 text-sm text-muted-foreground">
                  {warning}
                </p>
              ))}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="grid gap-5 content-start">
                <div className="grid gap-1.5">
                  <Label htmlFor="byline">Credit</Label>
                  <Input
                    id="byline"
                    value={byline}
                    maxLength={40}
                    placeholder="Your name or handle"
                    onChange={(event) => setByline(event.target.value)}
                    {...{ onValueChange: setByline }}
                  />
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="description">Notes</Label>
                    <span className="text-xs text-muted-foreground">{description.length}/220</span>
                  </div>
                  <Textarea
                    id="description"
                    value={description}
                    maxLength={220}
                    placeholder="Vehicles return attacking. The deck tries to win before the table untaps."
                    className="field-sizing-fixed max-w-full"
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>

                <ThemePicker selected={themes} onChange={setThemes} />

                {deck.commanders.length > 0 && commanderDeck ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="bracket">Commander bracket</Label>
                    <select
                      id="bracket"
                      className="h-10 w-full max-w-full rounded-lg border border-input bg-card px-2.5 text-sm"
                      value={bracket ?? ""}
                      onChange={(event) =>
                        setBracket(event.target.value ? Number(event.target.value) : null)
                      }
                    >
                      <option value="">Choose a bracket…</option>
                      {BRACKETS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.value} · {item.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm text-muted-foreground">
                      {deck.bracket
                        ? `Imported bracket ${deck.bracket}. Passport type uses whatever you pick here.`
                        : "Passport type uses this bracket. Deck sites do not always include one."}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-5 content-start">
            {deck.commanders.length > 0 ? (
              <div className="grid gap-3">
                <div>
                  <p className="text-sm font-medium">Commander printing</p>
                  <p className="text-sm text-muted-foreground">
                    This deck has a commander, so that card leads the left page. Pick the printing.
                  </p>
                </div>
                {commanders.length > 1 ? (
                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-medium">Face card</legend>
                    {commanders.map((entry, index) => (
                      <label key={entry.card.name} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="face-commander"
                          checked={faceIndex === index}
                          onChange={() => setFaceIndex(index)}
                        />
                        {entry.card.name}
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                {commanders.length > 1 || facePrinting?.backImageUrl ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="secondary-card">Secondary card bands</Label>
                    <select
                      id="secondary-card"
                      className="h-10 w-full max-w-full rounded-lg border border-input bg-card px-2.5 text-sm"
                      value={secondaryChoice}
                      onChange={(event) => setSecondaryChoice(event.target.value as SecondaryChoice)}
                    >
                      <option value="none">None</option>
                      {commanders.length > 1 && partnerChoice ? (
                        <option value="partner">
                          Other commander — {partnerChoice.card.name}
                        </option>
                      ) : null}
                      {facePrinting?.backImageUrl ? (
                        <option value="back">
                          Back face{facePrinting.backName ? ` — ${facePrinting.backName}` : ""}
                        </option>
                      ) : null}
                    </select>
                    <p className="text-sm text-muted-foreground">
                      The name bar sits above the commander and the rules text sits below it, cropped from the secondary card.
                    </p>
                  </div>
                ) : null}
                {commanders.map((entry, index) => (
                  <div key={entry.card.name} className="grid gap-1.5">
                    <Label htmlFor={`printing-${index}`}>{entry.card.name}</Label>
                    {entry.loading ? (
                      <p className="text-sm text-muted-foreground">Loading printings…</p>
                    ) : entry.error ? (
                      <p className="text-sm text-destructive">{entry.error}</p>
                    ) : (
                      <select
                        id={`printing-${index}`}
                        className="h-10 w-full max-w-full rounded-lg border border-input bg-card px-2.5 text-sm"
                        value={entry.selectedId}
                        onChange={(event) =>
                          setCommanders((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, selectedId: event.target.value }
                                : item,
                            ),
                          )
                        }
                      >
                        {entry.printings.map((printing, printingIndex) => (
                          <option key={printing.id} value={printing.id}>
                            {printingOptionLabel(printing, printingIndex)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3">
              <div>
                <p className="text-sm font-medium">Spotlight cards</p>
                <p className="text-sm text-muted-foreground">
                  Up to three cards from this deck. Pick a printing like the commander.
                </p>
              </div>
              <SpotlightPicker cards={suggestions} onPick={assignSpotlight} />
              {spotlights.map((slot, index) => (
                <div key={index} className="grid gap-1.5">
                  <Label htmlFor={`spotlight-${index}`}>Spotlight {index + 1}</Label>
                  {slot.card ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{slot.card.name}</span>
                        <Button type="button" variant="outline" size="sm" onClick={() => clearSpotlight(index)}>
                          Clear
                        </Button>
                      </div>
                      {slot.loading ? (
                        <p className="text-sm text-muted-foreground">Loading printings…</p>
                      ) : slot.error ? (
                        <p className="text-sm text-destructive">{slot.error}</p>
                      ) : (
                        <select
                          id={`spotlight-${index}`}
                          className="h-10 w-full max-w-full rounded-lg border border-input bg-card px-2.5 text-sm"
                          value={slot.selectedId}
                          onChange={(event) =>
                            setSpotlights((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, selectedId: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                        >
                          {slot.printings.map((printing, printingIndex) => (
                            <option key={printing.id} value={printing.id}>
                              {printingOptionLabel(printing, printingIndex)}
                            </option>
                          ))}
                        </select>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Empty — add a card from the list above.</p>
                  )}
                </div>
              ))}
            </div>
              </div>

              <div className="grid gap-2 md:col-span-2">
                <Button type="button" className="h-10" disabled={exporting} onClick={() => void downloadPoster()}>
                  {exporting ? "Saving PNG…" : "Download PNG"}
                </Button>
                {exportError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {exportError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Preview
          </h2>
          {deck ? (
            <Button type="button" size="sm" disabled={exporting} onClick={() => void downloadPoster()}>
              {exporting ? "Saving…" : "Download PNG"}
            </Button>
          ) : null}
        </div>
        <div ref={frameRef} className="w-full min-w-0">
          <div
            className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15"
            style={{ width: POSTER_WIDTH * scale, height: POSTER_HEIGHT * scale }}
          >
            <div
              ref={posterRef}
              style={{
                width: POSTER_WIDTH,
                height: POSTER_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              {poster}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
