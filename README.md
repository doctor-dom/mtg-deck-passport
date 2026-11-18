# Deck Passport

Turn a public Magic: The Gathering deck link into an open passport. Paste a deck from Moxfield, Archidekt, or ManaBox, pick up to three spotlight cards from the list, choose up to three Moxfield-style themes for endorsements, write a short description, and download a PNG.

The sheet is faint blue at 2000×1280. The left column shows the commander (or the first spotlight card when there is no commander), format and set-symbol visas, and power stamps for a commander bracket. The center gutter always holds a full-size QR code and deck URL. The right side carries the deck title, passport fields, notes, and up to three pinned spotlight cards. There is no mana curve and no card-art backdrop.

Commander decks stamp a bracket from 1 (Exhibition) through 5 (cEDH) as that many commander-symbol stamps, with the level centered underneath. If the deck site includes a bracket, it is selected for you and you can change it. Other formats stamp the deck type instead, such as Standard, Modern, or Historic. Endorsements come from up to three themes in the searchable Moxfield theme list, shown comma-separated on the passport.

A single commander uses a larger card image in the left column. For a partner, background, or other second commander—or for a double-faced back—you can show cropped name and rules bands above and below a smaller commander; the QR gutter does not move or shrink. Spotlight cards are chosen from the loaded deck with the same printing dropdown as the commander. The made-by visa stays beside the passport text.

The QR code opens the same deck link you pasted, rewritten to a stable URL for that site.

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