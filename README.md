# Deck Spotlight

Turn a public Magic: The Gathering deck link into a shareable poster. Paste a deck from Moxfield, Archidekt, or ManaBox, choose up to three spotlight cards, write a short description, and download a PNG.

Commander, Brawl, and Oathbreaker decks are detected automatically. The commander (or oathbreaker) is added as the lead card, and you pick which printing to show. The poster background is a zoomed, centered, faded crop of that card's art. Other decks use the first spotlight card for the lead art instead.

The QR code and the "Explore the full deck" line open the same deck link you pasted, rewritten to a stable URL for that site.

## Card syntax

Each spotlight card is entered as:

- `Slither Blade` — original printing
- `Slither Blade|MH2` — that set
- `Slither Blade|MH2 123` — that set and collector number

You can also pick a card from the loaded deck. That fills in the deck's own set and collector number.

## Run it locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

```bash
npm test
```

Card data, images, and mana symbols come from [Scryfall](https://scryfall.com/docs/api). Moxfield often blocks datacenter addresses; when that happens the app reads the public deck through a reader fallback, which can take longer than Archidekt or ManaBox.
