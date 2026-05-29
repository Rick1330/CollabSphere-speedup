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

export interface PageContentBox {
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  contentHeight: number;
}

const PAGE_SIZE_PX: Record<PageFormat, { width: number; height: number }> = {
  letter: { width: 816, height: 1056 },
  a4: { width: 794, height: 1123 },
  legal: { width: 816, height: 1344 },
};

export const DEFAULT_PAGE_SETUP: PageSetup = {
  format: "a4",
  orientation: "portrait",
  margins: { top: 96, right: 96, bottom: 96, left: 96 },
};

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

/** CSS px at 96dpi → mm for Playwright margins. */
export function pixelsToMm(px: number): number {
  return Math.round((px / 96) * 25.4 * 10) / 10;
}

export function pageSetupToPrintOptions(setup: PageSetup = DEFAULT_PAGE_SETUP) {
  const pageSize =
    setup.format === "a4" ? "A4" : setup.format === "legal" ? "Legal" : "Letter";
  return {
    pageSize: pageSize as "A4" | "Letter" | "Legal",
    orientation: setup.orientation,
    marginMm: {
      top: pixelsToMm(setup.margins.top),
      right: pixelsToMm(setup.margins.right),
      bottom: pixelsToMm(setup.margins.bottom),
      left: pixelsToMm(setup.margins.left),
    },
    contentBox: getPageContentBox(setup),
  };
}
