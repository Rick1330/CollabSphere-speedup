export type PageFormat = "letter" | "a4" | "legal";
export type PageOrientation = "portrait" | "landscape";

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageSetup {
  format: PageFormat;
  orientation: PageOrientation;
  margins: PageMargins;
}

const PAGE_SIZE_PX: Record<PageFormat, { width: number; height: number }> = {
  letter: { width: 816, height: 1056 },
  a4: { width: 794, height: 1123 },
  legal: { width: 816, height: 1344 },
};

const DEFAULT_MARGINS_IN = 1;

export const DEFAULT_PAGE_SETUP: PageSetup = {
  format: "a4",
  orientation: "portrait",
  margins: {
    top: DEFAULT_MARGINS_IN * 96,
    right: DEFAULT_MARGINS_IN * 96,
    bottom: DEFAULT_MARGINS_IN * 96,
    left: DEFAULT_MARGINS_IN * 96,
  },
};

const FORMAT_TOLERANCE_PX = 5;

export function normalizePageSetup(setup: Partial<PageSetup>): PageSetup {
  return {
    format: setup.format ?? DEFAULT_PAGE_SETUP.format,
    orientation: setup.orientation ?? DEFAULT_PAGE_SETUP.orientation,
    margins: setup.margins ?? { ...DEFAULT_PAGE_SETUP.margins },
  };
}

export function detectPageFormat(widthPx: number, heightPx: number): PageFormat {
  const candidates: Array<{ format: PageFormat; width: number; height: number }> = [
    { format: "letter", ...PAGE_SIZE_PX.letter },
    { format: "a4", ...PAGE_SIZE_PX.a4 },
    { format: "legal", ...PAGE_SIZE_PX.legal },
  ];

  for (const { format, width, height } of candidates) {
    if (
      (Math.abs(widthPx - width) <= FORMAT_TOLERANCE_PX &&
        Math.abs(heightPx - height) <= FORMAT_TOLERANCE_PX) ||
      (Math.abs(widthPx - height) <= FORMAT_TOLERANCE_PX &&
        Math.abs(heightPx - width) <= FORMAT_TOLERANCE_PX)
    ) {
      return format;
    }
  }

  let best: PageFormat = "a4";
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const { format, width, height } of candidates) {
    const delta = Math.min(
      Math.abs(widthPx - width) + Math.abs(heightPx - height),
      Math.abs(widthPx - height) + Math.abs(heightPx - width),
    );
    if (delta < bestDelta) {
      bestDelta = delta;
      best = format;
    }
  }
  return best;
}
