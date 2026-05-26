const FONT_SUBSTITUTION: Record<string, string> = {
  Calibri: "Carlito",
  Cambria: "Caladea",
  "Times New Roman": "Liberation Serif",
  Arial: "Liberation Sans",
  "Courier New": "Liberation Mono",
  Georgia: "Georgia",
  Verdana: "Verdana",
};

export function substituteFontFamily(fontName: string): { family: string; substituted: boolean } {
  const trimmed = fontName.trim();
  const sub = FONT_SUBSTITUTION[trimmed];
  if (sub) {
    return { family: sub, substituted: sub !== trimmed };
  }
  return { family: trimmed, substituted: false };
}
