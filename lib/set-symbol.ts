import fs from "node:fs";
import path from "node:path";

const SVG_DIR = path.join(process.cwd(), "node_modules", "keyrune", "svg");

export const COMMANDER_SYMBOL = "c14";

export function setSymbolCode(code: string | undefined): string | undefined {
  const cleaned = code?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
  if (!cleaned || cleaned.length > 12) return undefined;
  return cleaned;
}

export function readSetSymbol(code: string, ink: string): string | undefined {
  const safe = setSymbolCode(code);
  if (!safe || !/^#[0-9a-fA-F]{6}$/.test(ink)) return undefined;
  const file = path.resolve(SVG_DIR, `${safe}.svg`);
  if (!file.startsWith(SVG_DIR + path.sep)) return undefined;
  if (!fs.existsSync(file)) return undefined;
  return fs.readFileSync(file, "utf8").replace(/fill="#[0-9a-fA-F]{3,8}"/g, `fill="${ink}"`);
}
