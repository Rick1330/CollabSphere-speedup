import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SETUP,
  detectPageFormat,
  getPageContentBox,
  normalizePageSetup,
  twipsToPixels,
} from "../pageSetup";

describe("getPageContentBox", () => {
  it("returns A4 portrait dimensions by default", () => {
    const { pageWidth, pageHeight } = getPageContentBox(DEFAULT_PAGE_SETUP);
    expect(pageWidth).toBe(794);
    expect(pageHeight).toBe(1123);
  });

  it("swaps dimensions for landscape", () => {
    const setup = normalizePageSetup({
      format: "letter",
      orientation: "landscape",
    });
    const { pageWidth, pageHeight } = getPageContentBox(setup);
    expect(pageWidth).toBe(1056);
    expect(pageHeight).toBe(816);
  });
});

describe("detectPageFormat", () => {
  it("detects US Letter at 96dpi", () => {
    expect(detectPageFormat(816, 1056)).toBe("letter");
  });

  it("detects A4 within tolerance", () => {
    expect(detectPageFormat(794, 1123)).toBe("a4");
    expect(detectPageFormat(792, 1121)).toBe("a4");
  });

  it("detects landscape letter when dimensions are swapped", () => {
    expect(detectPageFormat(1056, 816)).toBe("letter");
  });
});

describe("twipsToPixels", () => {
  it("converts 1 inch (1440 twips) to 96px", () => {
    expect(twipsToPixels(1440)).toBe(96);
  });
});
