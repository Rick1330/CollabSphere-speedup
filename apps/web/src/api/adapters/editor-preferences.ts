import { request } from "@/api/client";
import { parseApiSingleEnvelope } from "@/api/client/envelope";

export type EditorPreferences = {
  recentColors: string[];
};

const LOCAL_KEY = "collab-editor-recent-colors";
const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function normalizeRecentColors(input: unknown): string[] {
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

export function readLocalRecentColors(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    return normalizeRecentColors(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeLocalRecentColors(colors: string[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizeRecentColors(colors)));
}

export async function fetchEditorPreferences(): Promise<EditorPreferences> {
  const payload = await request<unknown>("/users/me/editor-preferences");
  const resource = parseApiSingleEnvelope<EditorPreferences>(payload);
  const recentColors = normalizeRecentColors(resource.recentColors);
  writeLocalRecentColors(recentColors);
  return { recentColors };
}

export async function updateEditorPreferences(prefs: EditorPreferences): Promise<EditorPreferences> {
  const recentColors = normalizeRecentColors(prefs.recentColors);
  writeLocalRecentColors(recentColors);
  try {
    const payload = await request<unknown>("/users/me/editor-preferences", {
      method: "PATCH",
      body: { recentColors },
    });
    const resource = parseApiSingleEnvelope<EditorPreferences>(payload);
    return { recentColors: normalizeRecentColors(resource.recentColors) };
  } catch {
    return { recentColors };
  }
}

export function pushRecentColor(current: string[], hex: string): string[] {
  const normalized = hex.trim().toUpperCase();
  if (!HEX_RE.test(normalized)) return current;
  return [normalized, ...current.filter((c) => c !== normalized)].slice(0, 10);
}
