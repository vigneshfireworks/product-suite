/** Deterministic integer hash for a string */
export function strHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = Math.imul(h, 31) ^ s.charCodeAt(i);
  return Math.abs(h);
}

/** Pick a unique emoji based on business name keywords, then category fallback */
export function bizEmoji(name: string, category: string): string {
  const n = name.toLowerCase();
  if (n.includes("cracker") || n.includes("firecrack") || n.includes("firework")) return "🎆";
  if (n.includes("invitation") || n.includes("invite") || n.includes("wedding")) return "💌";
  if (n.includes("gift") || n.includes("hamper") || n.includes("return gift"))   return "🎁";
  if (n.includes("royal") || n.includes("elegant") || n.includes("luxury"))      return "👑";
  if (n.includes("finance") || n.includes("loan") || n.includes("credit"))       return "🏦";
  if (n.includes("market") || n.includes("analytics") || n.includes("analysis")) return "📊";
  if (n.includes("stock") || n.includes("share") || n.includes("invest"))        return "📈";
  if (n.includes("grocery") || n.includes("food") || n.includes("restaurant"))   return "🍽️";
  if (n.includes("cloth") || n.includes("fashion") || n.includes("dress"))       return "👗";
  if (n.includes("tech") || n.includes("software") || n.includes("digital"))     return "💻";
  const fallbacks: Record<string, string[]> = {
    retail:          ["🛍️", "🏪", "🏷️", "🎀", "🌟"],
    finance:         ["💼", "💰", "🏦", "📈"],
    market_analysis: ["📊", "📈", "💹", "🔭"],
    other:           ["⭐", "🎯", "✨", "🚀"],
  };
  const arr = fallbacks[category] ?? ["🏪"];
  return arr[strHash(name) % arr.length];
}

/** Generate a unique pastel bg + dot color per business using its id */
export function bizColors(id: string, category: string): { bg: string; dot: string } {
  const baseHue: Record<string, number> = {
    retail: 25, finance: 205, market_analysis: 148, other: 270,
  };
  const base  = baseHue[category] ?? 200;
  const shift = (strHash(id) % 50) - 25;
  const hue   = ((base + shift) % 360 + 360) % 360;
  return {
    bg:  `hsl(${hue},70%,94%)`,
    dot: `hsl(${hue},55%,48%)`,
  };
}

export const CAT_LABEL: Record<string, string> = {
  retail: "Retail",
  finance: "Finance",
  market_analysis: "Market Analysis",
  other: "Other",
};
