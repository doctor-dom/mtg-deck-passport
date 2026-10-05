# Deck Passport

Turn a public Magic: The Gathering deck link into an open passport. Paste a deck from Moxfield, Archidekt, or ManaBox, choose up to three spotlight cards, write a short description, and download a PNG.

The sheet is faint blue. The commander side shows the commander (or the first spotlight card, when the deck has no commander), the deck-type visa, the playstyle stamp, power stamps for a commander bracket, and a large deck-list QR. The other side shows a large deck title, the description, and the spotlight cards. There is no mana curve and no card-art backdrop.

Commander decks stamp a bracket from 1 (Exhibition) through 5 (cEDH) as that many power stamps. If the deck site includes a bracket, it is selected for you and you can change it. Other formats stamp the deck type instead, such as Standard, Modern, or Historic. The playstyle stamp takes up to two of aggro, control, combo, midrange, or ramp.

Commander, Brawl, and Oathbreaker decks are detected automatically. You pick the commander printing. If that printing is double-faced, you can show the back face.

The QR code and the Deck List line open the same deck link you pasted, rewritten to a stable URL for that site.

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
