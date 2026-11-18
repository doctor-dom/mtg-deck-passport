import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { passportTypeLine, readBracket } from "../lib/bracket";
import { parseCardSpec, specFromCard } from "../lib/card-spec";
import { faceImages } from "../lib/faces";
import { endorsementsFromThemes, THEMES, toggleTheme } from "../lib/themes";
import { normalizeColors } from "../lib/colors";
import { parseArchidektDeck } from "../lib/decks/parse-archidekt";
import { parseManaboxHtml } from "../lib/decks/parse-manabox";
import { parseMoxfieldDeck } from "../lib/decks/parse-moxfield";
import { manaCurve } from "../lib/mana-curve";
import { defaultPrintingId } from "../lib/printings";
import { assertScryfallImageUrl } from "../lib/images";
import { readSetSymbol, setSymbolCode } from "../lib/set-symbol";
import { spotlightKindFrom } from "../lib/spotlight";
import type { DeckCard, ResolvedPrinting } from "../lib/types";
import { canonicalDeckUrl, parseDeckUrl } from "../lib/urls";

function card(partial: Partial<DeckCard> & Pick<DeckCard, "name" | "manaValue" | "board">): DeckCard {
  return {
    quantity: 1,
    typeLine: partial.isLand ? "Land" : "Creature",
    isLand: false,
    colorIdentity: [],
    detailsIncomplete: false,
    ...partial,
  };
}

describe("deck urls", () => {
  it("accepts the three deck hosts and rebuilds a stable link", () => {
    assert.deepEqual(parseDeckUrl("https://www.moxfield.com/decks/AbC123?utm=1"), {
      source: "moxfield",
      id: "AbC123",
    });
    assert.deepEqual(parseDeckUrl("archidekt.com/decks/27045649/jace-b4"), {
      source: "archidekt",
      id: "27045649",
    });
    assert.deepEqual(parseDeckUrl("https://manabox.app/decks/4ZHzry4jQJ6yFB0qEo1RmA"), {
      source: "manabox",
      id: "4ZHzry4jQJ6yFB0qEo1RmA",
    });
    assert.equal(parseDeckUrl("https://example.com/decks/1"), null);
    assert.equal(
      canonicalDeckUrl("archidekt", "27045649", "Jace B4", "https://archidekt.com/decks/27045649/jace-b4"),
      "https://archidekt.com/decks/27045649/jace-b4",
    );
    assert.equal(
      canonicalDeckUrl("moxfield", "AbC123", "Oni Ninjas"),
      "https://moxfield.com/decks/AbC123",
    );
  });
});

describe("card specs", () => {
  it("defaults a bare name to the original printing and keeps set plus collector number", () => {
    assert.deepEqual(parseCardSpec("Slither Blade"), { name: "Slither Blade" });
    assert.deepEqual(parseCardSpec("Slither Blade|MH2"), {
      name: "Slither Blade",
      set: "mh2",
    });
    assert.deepEqual(parseCardSpec("Satoru Umezawa|set NEO 270"), {
      name: "Satoru Umezawa",
      set: "neo",
      collectorNumber: "270",
    });
    assert.deepEqual(parseCardSpec("Sol Ring (LTC) 282"), {
      name: "Sol Ring",
      set: "ltc",
      collectorNumber: "282",
    });
    assert.equal(parseCardSpec("   "), null);
  });

  it("writes a deck card back into the set syntax", () => {
    assert.equal(
      specFromCard(
        card({
          name: "Sol Ring",
          manaValue: 1,
          board: "main",
          set: "ltc",
          collectorNumber: "282",
        }),
      ),
      "Sol Ring|LTC 282",
    );
  });
});

describe("mana curve", () => {
  it("ignores lands and commanders and parks seven-plus mana together", () => {
    const curve = manaCurve([
      card({ name: "Commander", manaValue: 4, board: "commander" }),
      card({ name: "Island", manaValue: 0, board: "main", isLand: true }),
      card({ name: "One", manaValue: 1, board: "main", quantity: 2 }),
      card({ name: "Seven", manaValue: 8, board: "main" }),
      card({ name: "Side", manaValue: 2, board: "side" }),
    ]);
    assert.deepEqual(curve.buckets, [0, 2, 0, 0, 0, 0, 0, 1]);
    assert.equal(curve.average, 3.3);
    assert.equal(curve.spellCount, 3);
  });
});

describe("deck parsers", () => {
  it("reads a Moxfield companion in its own slot", () => {
    const parsed = parseMoxfieldDeck({
      name: "Lurrus",
      format: "commander",
      boards: {
        commanders: {
          cards: {
            "id-1": {
              quantity: 1,
              card: {
                name: "Aminatou, the Fateshifter",
                cmc: 3,
                type_line: "Legendary Planeswalker — Aminatou",
                color_identity: ["W", "U"],
              },
            },
          },
        },
        companions: {
          cards: {
            "id-2": {
              quantity: 1,
              card: {
                name: "Lurrus of the Dream-Den",
                cmc: 3,
                type_line: "Legendary Creature — Cat Nightmare",
                color_identity: ["W", "B"],
              },
            },
          },
        },
      },
    });
    assert.equal(parsed.cards.find((entry) => entry.board === "companion")?.name, "Lurrus of the Dream-Den");
  });

  it("treats a Moxfield commander board as the extra spotlight", () => {
    const parsed = parseMoxfieldDeck({
      name: "EDH Oni Ninja",
      format: "commander",
      publicUrl: "https://moxfield.com/decks/abc",
      colors: ["U", "B"],
      createdByUser: { userName: "doctor_bowties" },
      bracket: 3,
      boards: {
        commanders: {
          cards: {
            "id-1": {
              quantity: 1,
              card: {
                name: "Satoru Umezawa",
                set: "neo",
                cn: "270",
                cmc: 4,
                type_line: "Legendary Creature — Human Ninja",
                color_identity: ["U", "B"],
                scryfall_id: "11111111-1111-1111-1111-111111111111",
              },
            },
          },
        },
        mainboard: {
          cards: {
            "id-2": {
              quantity: 1,
              card: {
                name: "Island",
                set: "neo",
                cn: "285",
                cmc: 0,
                type_line: "Basic Land — Island",
                color_identity: ["U"],
              },
            },
          },
        },
      },
    });
    assert.equal(parsed.cards.find((entry) => entry.board === "commander")?.name, "Satoru Umezawa");
    assert.equal(parsed.cards.find((entry) => entry.name === "Island")?.isLand, true);
    assert.equal(parsed.author, "doctor_bowties");
    assert.equal(parsed.bracket, 3);
    assert.equal(
      spotlightKindFrom(parsed.format, {
        hasCommander: true,
        hasOathbreaker: false,
      }),
      "commander",
    );
  });

  it("reads an Archidekt companion separately from the sideboard", () => {
    const parsed = parseArchidektDeck({
      name: "Lurrus",
      deckFormat: 3,
      categories: [{ id: 1, name: "Commander" }, { id: 2, name: "Companion" }],
      cards: [
        {
          quantity: 1,
          companion: true,
          categories: ["Companion"],
          card: {
            edition: { editioncode: "iko" },
            oracleCard: {
              name: "Lurrus of the Dream-Den",
              cmc: 3,
              types: ["Creature"],
            },
          },
        },
      ],
    });
    assert.equal(parsed.cards[0]?.board, "companion");
    assert.equal(parsed.cards[0]?.name, "Lurrus of the Dream-Den");
  });

  it("reads an Archidekt commander category separately from the 99", () => {
    const parsed = parseArchidektDeck({
      name: "Jace B4",
      deckFormat: 3,
      owner: { username: "pilot@example.com" },
      categories: [{ id: 1, name: "Commander" }],
      cards: [
        {
          quantity: 1,
          categories: ["Commander"],
          card: {
            collectorNumber: "1",
            uid: "22222222-2222-2222-2222-222222222222",
            edition: { editioncode: "frc" },
            oracleCard: {
              name: "Jace, Multiverse Architect",
              cmc: 5,
              colorIdentity: ["Blue"],
              superTypes: ["Legendary"],
              types: ["Planeswalker"],
              subTypes: ["Jace"],
            },
          },
        },
        {
          quantity: 2,
          categories: ["Sideboard"],
          card: {
            oracleCard: {
              name: "Ponder",
              cmc: 1,
              types: ["Sorcery"],
              colorIdentity: ["Blue"],
            },
          },
        },
      ],
    });
    assert.equal(parsed.author, undefined);
    assert.equal(parsed.cards[0]?.board, "commander");
    assert.equal(parsed.cards[1]?.board, "side");
    assert.equal(parsed.cards[0]?.typeLine, "Legendary Planeswalker — Jace");
    assert.deepEqual(normalizeColors(parsed.cards[0]?.colorIdentity), ["U"]);
  });

  it("reads a ManaBox commander from the shared page props", () => {
    const props = JSON.stringify({
      deck: [
        0,
        {
          name: [0, "Mk1"],
          format: [0, "Commander"],
          colors: [0, "{U}{R}"],
          cards: [
            0,
            [
              [
                0,
                {
                  name: [0, "Iron Man, Titan of Innovation"],
                  quantity: [0, 1],
                  boardCategory: [0, 0],
                  type: [0, 1],
                  manaValue: [0, 5],
                  setId: [0, "pip"],
                  collectorNumber: [0, "1"],
                  colorIdentity: [0, "RU"],
                },
              ],
              [
                0,
                {
                  name: [0, "Island"],
                  quantity: [0, 4],
                  boardCategory: [0, 3],
                  type: [0, 7],
                  manaValue: [0, 0],
                  setId: [0, "dsk"],
                  collectorNumber: [0, "280"],
                  colorIdentity: [0, "U"],
                },
              ],
            ],
          ],
        },
      ],
    }).replaceAll('"', "&quot;");
    const parsed = parseManaboxHtml(`<astro-island component-url="/deck.js" props="${props}"></astro-island>`);
    assert.equal(parsed.format, "Commander");
    assert.equal(parsed.cards[0]?.board, "commander");
    assert.equal(parsed.cards[1]?.isLand, true);
    assert.deepEqual(parsed.colors, ["U", "R"]);
    assert.equal(
      spotlightKindFrom(parsed.format, { hasCommander: true, hasOathbreaker: false }),
      "commander",
    );
  });
});

describe("passport stamps", () => {
  it("reads a commander bracket from a number or a nested deck field", () => {
    assert.equal(readBracket(4), 4);
    assert.equal(readBracket("2"), 2);
    assert.equal(readBracket({ autoBracket: { bracket: 5 } }), 5);
    assert.equal(readBracket(0), undefined);
    assert.equal(readBracket("cedh"), undefined);
  });

  it("formats passport type as a level line", () => {
    assert.equal(passportTypeLine(2), "Level Two - Core");
    assert.equal(passportTypeLine(null), undefined);
  });

  it("keeps at most three theme tags", () => {
    assert.equal(THEMES.length, 94);
    assert.deepEqual(toggleTheme(["aggro"], "ramp"), ["aggro", "ramp"]);
    assert.deepEqual(toggleTheme(["aggro", "ramp"], "control"), ["aggro", "ramp", "control"]);
    assert.deepEqual(
      toggleTheme(["aggro", "ramp", "control"], "vehicles"),
      ["aggro", "ramp", "control"],
    );
    assert.equal(endorsementsFromThemes(["vehicles", "ramp"]), "Vehicles, Ramp");
  });

  it("keeps a separate back image only when the second face has one", () => {
    assert.equal(
      faceImages({
        image_uris: { large: "https://cards.scryfall.io/front.jpg" },
        card_faces: [{ name: "Front" }, { name: "Back" }],
      }).backImageUrl,
      undefined,
    );
    const faces = faceImages({
      card_faces: [
        { name: "Esika, God of the Tree", image_uris: { large: "https://cards.scryfall.io/front.jpg", art_crop: "https://cards.scryfall.io/front-art.jpg" } },
        { name: "The Prismatic Bridge", image_uris: { large: "https://cards.scryfall.io/back.jpg" } },
      ],
    });
    assert.equal(faces.imageUrl, "https://cards.scryfall.io/front.jpg");
    assert.equal(faces.backImageUrl, "https://cards.scryfall.io/back.jpg");
    assert.equal(faces.backName, "The Prismatic Bridge");
  });

  it("reads a Keyrune set symbol and the commander mark", () => {
    assert.equal(setSymbolCode("NEO"), "neo");
    assert.equal(setSymbolCode("../neo"), "neo");
    assert.equal(setSymbolCode(""), undefined);
    assert.match(readSetSymbol("neo", "#1e4b7a") ?? "", /fill="#1e4b7a"/);
    assert.match(readSetSymbol("c14", "#9c2b2b") ?? "", /fill="#9c2b2b"/);
    assert.match(readSetSymbol("sld", "#1e4b7a") ?? "", /fill="#1e4b7a"/);
    assert.equal(readSetSymbol("notaset", "#1e4b7a"), undefined);
    assert.equal(readSetSymbol("neo", "blue"), undefined);
  });
});

describe("printings and images", () => {
  it("prefers the deck printing and otherwise the earliest printing", () => {
    const printings = [
      printing("original", "lea", "232", "1993-08-05"),
      printing("deck", "neo", "270", "2022-02-18"),
    ];
    assert.equal(
      defaultPrintingId(printings, card({ name: "Satoru", manaValue: 4, board: "commander", set: "NEO", collectorNumber: "270" })),
      "deck",
    );
    assert.equal(
      defaultPrintingId(printings, card({ name: "Satoru", manaValue: 4, board: "commander" })),
      "original",
    );
  });

  it("only proxies Scryfall card images", () => {
    assert.equal(
      assertScryfallImageUrl("https://cards.scryfall.io/art_crop/front/a/b/abcd.jpg").hostname,
      "cards.scryfall.io",
    );
    assert.throws(() => assertScryfallImageUrl("https://example.com/card.jpg"));
    assert.throws(() => assertScryfallImageUrl("http://cards.scryfall.io/a.jpg"));
  });
});

function printing(id: string, set: string, collectorNumber: string, releasedAt: string): ResolvedPrinting {
  return {
    id,
    name: "Satoru Umezawa",
    set,
    setName: set,
    collectorNumber,
    releasedAt,
    manaValue: 4,
    typeLine: "Legendary Creature — Human Ninja",
    imageUrl: "https://cards.scryfall.io/large/front/a/b/abcd.jpg",
    artCropUrl: "https://cards.scryfall.io/art_crop/front/a/b/abcd.jpg",
    reprint: id !== "original",
  };
}
