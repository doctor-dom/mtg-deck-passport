"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { specFromCard } from "@/lib/card-spec";
import { manaCurve } from "@/lib/mana-curve";
import { defaultPrintingId, printingOptionLabel } from "@/lib/printings";
import { kickerFor } from "@/lib/spotlight";
import type { DeckCard, NormalizedDeck, ResolvedPrinting } from "@/lib/types";
import { slugify } from "@/lib/urls";
import { domToPng } from "modern-screenshot";
import { useEffect, useMemo, useRef, useState } from "react";
import { POSTER_HEIGHT, POSTER_WIDTH, SpotlightPoster } from "./spotlight-poster";

const SAMPLES = [
  {
    source: "Archidekt",
    url: "https://archidekt.com/decks/27045649/jace-b4",
  },
  {
    source: "ManaBox",
    url: "https://manabox.app/decks/4ZHzry4jQJ6yFB0qEo1RmA",
  },
  {
    source: "Moxfield",
    url: "https://moxfield.com/decks/CFeCQ5NOMESJOSSGLB8cPg",
  },
];

type Slot = {
  input: string;
  card?: ResolvedPrinting;
  error?: string;
  loading: boolean;
};

type CommanderChoice = {
  card: DeckCard;
  printings: ResolvedPrinting[];
  selectedId: string;
  loading: boolean;
  error?: string;
};

const EMPTY_SLOTS: Slot[] = [
  { input: "", loading: false },
  { input: "", loading: false },
  { input: "", loading: false },
];

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
  const [slots, setSlots] = useState<Slot[]>(EMPTY_SLOTS);
  const [commanders, setCommanders] = useState<CommanderChoice[]>([]);
  const [faceIndex, setFaceIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [scale, setScale] = useState(0.42);
  const frameRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const slotKey = slots.map((slot) => slot.input).join("\n");

  async function resolveSlot(index: number, spec: string) {
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, loading: true, error: undefined } : slot,
      ),
    );
    try {
      const response = await fetch("/api/cards/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spec }),
      });
      const data = (await response.json()) as { card?: ResolvedPrinting; error?: string };
      setSlots((current) =>
        current.map((slot, slotIndex) => {
          if (slotIndex !== index || slot.input.trim() !== spec) return slot;
          if (!response.ok || !data.card) {
            return { ...slot, loading: false, card: undefined, error: data.error ?? "Card not found." };
          }
          return { ...slot, loading: false, card: data.card, error: undefined };
        }),
      );
    } catch {
      setSlots((current) =>
        current.map((slot, slotIndex) =>
          slotIndex === index && slot.input.trim() === spec
            ? { ...slot, loading: false, error: "Card lookup failed." }
            : slot,
        ),
      );
    }
  }

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
    const timers = slots.map((slot, index) => {
      const spec = slot.input.trim();
      if (!spec) return undefined;
      return setTimeout(() => {
        void resolveSlot(index, spec);
      }, 450);
    });
    return () => {
      timers.forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
    // slotKey is the only input that should retrigger resolution.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotKey]);

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
      setSlots(EMPTY_SLOTS.map((slot) => ({ ...slot })));
      setFaceIndex(0);
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

  function updateSlot(index: number, input: string) {
    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index
          ? { input, loading: false, card: undefined, error: undefined }
          : slot,
      ),
    );
  }

  function fillFromDeck(spec: string) {
    if (!spec) return;
    setSlots((current) => {
      const empty = current.findIndex((slot) => !slot.input.trim());
      const target = empty === -1 ? current.length - 1 : empty;
      return current.map((slot, index) =>
        index === target ? { input: spec, loading: false, card: undefined, error: undefined } : slot,
      );
    });
  }

  const curve = useMemo(() => manaCurve(deck?.cards ?? []), [deck]);
  const face = commanders[faceIndex] ?? commanders[0];
  const facePrinting = face?.printings.find((printing) => printing.id === face.selectedId);
  const firstSpotlight = slots.find((slot) => slot.card)?.card;
  const hasCommander = (deck?.commanders.length ?? 0) > 0;
  const heroPrinting = hasCommander ? facePrinting : firstSpotlight;
  const heroFallback = hasCommander ? face?.card : undefined;
  const partnerLine =
    commanders.length > 1
      ? `with ${commanders
          .filter((_, index) => index !== (commanders[faceIndex] ? faceIndex : 0))
          .map((entry) => entry.card.name)
          .join(" & ")}`
      : undefined;
  const highlights = slots
    .filter((slot) => slot.card)
    .map((slot) => ({ name: slot.card!.name, imageUrl: slot.card!.imageUrl }));
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
    <SpotlightPoster
      kicker={deck ? kickerFor(deck.spotlightKind) : "Deck spotlight"}
      byline={byline}
      deckName={deck?.name ?? "Your next deck"}
      subtitle={
        deck
          ? hasCommander
            ? (face?.card.name ?? deck.commanders[0]?.name ?? deck.formatLabel)
            : `${deck.formatLabel} · ${cardCount(deck)} cards`
          : "Paste a deck link to begin"
      }
      partnerLine={deck && hasCommander ? partnerLine : undefined}
      description={
        description ||
        (deck
          ? undefined
          : "Three spotlight cards, a short line about the deck, and a poster you can share.")
      }
      colors={deck?.colorIdentity ?? []}
      showColorless={deck != null && deck.colorIdentity.length === 0}
      heroImage={heroPrinting?.imageUrl ?? heroFallback?.imageUrl}
      heroName={heroPrinting?.name ?? heroFallback?.name ?? firstSpotlight?.name}
      artUrl={
        (hasCommander ? facePrinting?.artCropUrl ?? heroFallback?.artCropUrl : undefined) ??
        firstSpotlight?.artCropUrl
      }
      buckets={curve.buckets}
      average={curve.average}
      highlights={highlights}
      deckUrl={deck?.url}
      qrDataUrl={deck?.qrDataUrl}
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
        backgroundColor: "#070b14",
        style: { transform: "none", transformOrigin: "top left" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${slugify(deck.name) || "deck"}-spotlight.png`;
      link.click();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The poster could not be saved.");
    } finally {
      setExporting(false);
    }
  }

  const slowSource = /moxfield\.com/i.test(url);

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:px-6">
      <section className="grid min-w-0 content-start gap-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
            Deck Spotlight
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
            Turn a deck link into a shareable card.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Paste a Moxfield, Archidekt, or ManaBox deck. Add up to three spotlight cards and a
            short description. Commander decks put the commander on the poster as a fourth card.
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
                <Label htmlFor="description">Short description</Label>
                <span className="text-xs text-muted-foreground">{description.length}/180</span>
              </div>
              <Textarea
                id="description"
                value={description}
                maxLength={180}
                placeholder="Unblockable creatures and ninjutsu, ending in a flashy attack."
                className="field-sizing-fixed max-w-full"
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            {deck.commanders.length > 0 ? (
              <div className="grid gap-3">
                <div>
                  <p className="text-sm font-medium">Commander printing</p>
                  <p className="text-sm text-muted-foreground">
                    This deck has a commander, so that card leads the poster. Pick the printing.
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
                  Up to three cards. Use <span className="text-foreground">Name</span>,{" "}
                  <span className="text-foreground">Name|SET</span>, or{" "}
                  <span className="text-foreground">Name|SET 123</span>. Skip the set and the
                  original printing is used.
                </p>
              </div>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Add from this deck</span>
                <select
                  className="h-10 w-full max-w-full rounded-lg border border-input bg-card px-2.5 text-sm"
                  value=""
                  onChange={(event) => fillFromDeck(event.target.value)}
                >
                  <option value="">Choose a card…</option>
                  {suggestions.map((card) => (
                    <option key={specFromCard(card)} value={specFromCard(card)}>
                      {card.name}
                      {card.set ? ` (${card.set.toUpperCase()})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {slots.map((slot, index) => (
                <div key={index} className="grid gap-1.5">
                  <Label htmlFor={`spotlight-${index}`}>Spotlight {index + 1}</Label>
                  <Input
                    id={`spotlight-${index}`}
                    value={slot.input}
                    placeholder={index === 0 ? "Satoru Umezawa|NEO" : "Card name"}
                    onChange={(event) => updateSlot(index, event.target.value)}
                    {...{
                      onValueChange: (value: string) => updateSlot(index, value),
                    }}
                  />
                  {slot.loading ? (
                    <p className="text-xs text-muted-foreground">Finding that printing…</p>
                  ) : null}
                  {slot.error ? <p className="text-xs text-destructive">{slot.error}</p> : null}
                  {slot.card ? (
                    <p className="text-xs text-muted-foreground">
                      {slot.card.setName} ({slot.card.set.toUpperCase()}) #{slot.card.collectorNumber}
                      {slot.card.reprint ? "" : " · original"}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <Button type="button" className="h-10" disabled={exporting} onClick={() => void downloadPoster()}>
              {exporting ? "Saving PNG…" : "Download PNG"}
            </Button>
            {exportError ? (
              <p role="alert" className="text-sm text-destructive">
                {exportError}
              </p>
            ) : null}
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
