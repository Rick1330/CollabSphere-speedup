const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export type EditorPreferencesJson = {
  recentColors?: string[];
};

export function normalizeRecentColors(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const hex = raw.trim().toUpperCase();
    if (!HEX_RE.test(hex) || seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
    if (out.length >= 10) break;
  }
  return out;
}

export function pushRecentColor(current: string[], hex: string): string[] {
  const normalized = hex.trim().toUpperCase();
  if (!HEX_RE.test(normalized)) return current;
  return [normalized, ...current.filter((c) => c !== normalized)].slice(0, 10);
}
