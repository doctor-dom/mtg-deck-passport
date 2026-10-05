# Deck Passport

Turn a public Magic: The Gathering deck link into an open passport. Paste a deck from Moxfield, Archidekt, or ManaBox, choose up to three spotlight cards, write a short description, and download a PNG.

The sheet is faint blue. The commander side shows the commander (or the first spotlight card, when the deck has no commander), a visa, a gold set-symbol stamp on that visa’s top border, a green playstyle stamp, and power stamps for a commander bracket. A made-by visa sits beside the passport name. A large QR code is centered under the commander, with the deck URL beneath it. The other side shows the deck title, then passport name, place of birth, endorsements, and notes. There is no mana curve and no card-art backdrop.

Commander decks stamp a bracket from 1 (Exhibition) through 5 (cEDH) as that many commander-symbol stamps, with the level written underneath. If the deck site includes a bracket, it is selected for you and you can change it. Other formats stamp the deck type instead, such as Standard, Modern, or Historic. The playstyle stamp takes up to two of aggro, control, combo, midrange, or ramp. Endorsements are the sub-themes you type, such as vehicles or +1/+1 counters.

Commander, Brawl, and Oathbreaker decks are detected automatically. You pick the commander printing. If that printing is double-faced, the back face sits in the margin beside the commander at the same size as a spotlight card. Partner commanders use that same margin. The deck visas sit above and below the side card, at the same size and transparency as on a single-faced sheet, and the QR code under the front face stays the large single-commander size. The made-by visa stays to the right of the passport text, with "made by:" in the upper border and "MTG" on its own line above "Deck Passport".

The QR code under the commander opens the same deck link you pasted, rewritten to a stable URL for that site.

## Card syntax

Each spotlight card is entered as:

- `Satoru Umezawa` — original printing
- `Satoru Umezawa|NEO` — that set
- `Satoru Umezawa|NEO 234` — that set and collector number

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
