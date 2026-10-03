const IMAGE_HOSTS = new Set([
  "cards.scryfall.io",
  "c1.scryfall.com",
  "svgs.scryfall.io",
]);

export function scryfallImage(
  scryfallId: string,
  version: "large" | "normal" | "art_crop" | "png",
): string {
  const id = scryfallId.toLowerCase();
  return `https://cards.scryfall.io/${version}/front/${id[0]}/${id[1]}/${id}.jpg`;
}

export function upgradeScryfallVersion(
  url: string,
  version: "large" | "normal" | "art_crop",
): string {
  return url.replace(
    /\/(small|normal|large|png|art_crop|border_crop)\//,
    `/${version}/`,
  );
}

export function assertScryfallImageUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That image address is not valid.");
  }
  if (url.protocol !== "https:") {
    throw new Error("Card images have to come from Scryfall.");
  }
  if (url.username || url.password) {
    throw new Error("Card images have to come from Scryfall.");
  }
  if (!IMAGE_HOSTS.has(url.hostname)) {
    throw new Error("Card images have to come from Scryfall.");
  }
  return url;
}
