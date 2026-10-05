import fs from "node:fs";
import path from "node:path";

const SVG_DIR = path.join(process.cwd(), "node_modules", "keyrune", "svg");

export const COMMANDER_SYMBOL = "c14";

const SYMBOL_ALIASES: Record<string, string[]> = {
  sld: ["sld2"],
  slu: ["sld2"],
  psld: ["sld2"],
};

export function setSymbolCode(code: string | undefined): string | undefined {
  const cleaned = code?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  if (!cleaned || cleaned.length > 12) return undefined;
  return cleaned;
}

function symbolFile(code: string): string | undefined {
  const file = path.resolve(SVG_DIR, `${code}.svg`);
  if (!file.startsWith(SVG_DIR + path.sep) || !fs.existsSync(file)) return undefined;
  return file;
}

export function readSetSymbol(code: string, ink: string): string | undefined {
  const safe = setSymbolCode(code);
  if (!safe || !/^#[0-9a-fA-F]{6}$/.test(ink)) return undefined;
  const file = symbolFile(safe) ?? SYMBOL_ALIASES[safe]?.map(symbolFile).find((item) => item);
  if (!file) return undefined;
  return fs.readFileSync(file, "utf8").replace(/fill="#[0-9a-fA-F]{3,8}"/g, `fill="${ink}"`);
}
