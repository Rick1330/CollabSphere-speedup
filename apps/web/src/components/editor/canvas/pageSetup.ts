export type PageFormat = "letter" | "a4" | "legal";
export type PageOrientation = "portrait" | "landscape";
export type MarginPreset = "normal" | "narrow" | "wide";

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

/** US Letter at 96 CSS px per inch. */
const PAGE_SIZE_PX: Record<PageFormat, { width: number; height: number }> = {
  letter: { width: 816, height: 1056 },
  a4: { width: 794, height: 1123 },
  legal: { width: 816, height: 1344 },
};

const DEFAULT_MARGINS_IN = 1;

/** Professional body defaults (mockup: Source Serif 4, 11pt, 1.5 spacing). */
export const DOC_BODY_FONT_SIZE_PT = 11;
export const DOC_HEADING_FONT_SIZE_PT = 12;
export const DOC_BODY_LINE_HEIGHT = 1.5;

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

export interface PageContentBox {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentHeight: number;
}

/** Grey gutter between stacked pages on the canvas. */
export const PAGE_GAP_PX = 40;

/** Margin presets at 96 CSS px per inch. */
export const MARGIN_PRESETS: Record<MarginPreset, number> = {
  normal: 96,
  narrow: 48,
  wide: 144,
};

export function marginsFromPreset(preset: MarginPreset): PageMargins {
  const px = MARGIN_PRESETS[preset];
  return { top: px, right: px, bottom: px, left: px };
}

export function detectMarginPreset(margins: PageMargins): MarginPreset {
  const values = [margins.top, margins.right, margins.bottom, margins.left];
  if (values.every((v) => v === MARGIN_PRESETS.narrow)) return "narrow";
  if (values.every((v) => v === MARGIN_PRESETS.wide)) return "wide";
  return "normal";
}

export function normalizePageSetup(setup: Partial<PageSetup>): PageSetup {
  return {
    format: setup.format ?? DEFAULT_PAGE_SETUP.format,
    orientation: setup.orientation ?? DEFAULT_PAGE_SETUP.orientation,
    margins: setup.margins ?? { ...DEFAULT_PAGE_SETUP.margins },
  };
}

export function getPageSlotTop(pageIndex: number, setup: PageSetup = DEFAULT_PAGE_SETUP): number {
  const { pageHeight } = getPageContentBox(setup);
  return (pageIndex - 1) * (pageHeight + PAGE_GAP_PX);
}

export function getCanvasStackHeight(pageCount: number, setup: PageSetup = DEFAULT_PAGE_SETUP): number {
  if (pageCount < 1) return 0;
  const { pageHeight } = getPageContentBox(setup);
  return pageCount * pageHeight + (pageCount - 1) * PAGE_GAP_PX;
}

export function buildGridPageTops(pageCount: number, setup: PageSetup = DEFAULT_PAGE_SETUP): number[] {
  return Array.from({ length: Math.max(1, pageCount) }, (_, i) => getPageSlotTop(i + 1, setup));
}

export function getPageContentBox(setup: PageSetup = DEFAULT_PAGE_SETUP): PageContentBox {
  const base = PAGE_SIZE_PX[setup.format];
  const portrait = setup.orientation === "portrait";
  const pageWidth = portrait ? base.width : base.height;
  const pageHeight = portrait ? base.height : base.width;
  const { margins } = setup;
  return {
    pageWidth,
    pageHeight,
    contentWidth: Math.max(1, pageWidth - margins.left - margins.right),
    contentHeight: Math.max(1, pageHeight - margins.top - margins.bottom),
  };
}

const FORMAT_TOLERANCE_PX = 5;

/** Map measured page dimensions (CSS px) to the closest known format. */
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

export {
  twipsToPixels,
  twipsToPoints,
  pointsToPixels,
  pixelsToPoints,
  emusToPixels,
  halfPointsToPoints,
} from "@collabsphere/docx-import";
