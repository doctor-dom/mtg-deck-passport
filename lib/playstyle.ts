export const PLAYSTYLES = ["aggro", "control", "combo", "midrange", "ramp"] as const;

export type Playstyle = (typeof PLAYSTYLES)[number];

export function togglePlaystyle(current: readonly Playstyle[], next: Playstyle): Playstyle[] {
  if (current.includes(next)) return current.filter((item) => item !== next);
  if (current.length >= 2) return [...current];
  return [...current, next];
}

export function playstyleLabel(styles: readonly Playstyle[]): string {
  return styles.map((style) => style.toUpperCase()).join(" / ");
}
