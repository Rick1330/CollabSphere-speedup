import { describe, expect, it, vi } from "vitest";
import {
  FONT_SIZE_MAX_PT,
  FONT_SIZE_MIN_PT,
  getActiveStyleLabel,
  getFontSizePt,
  parseFontSizePt,
  setFontSizePt,
} from "./toolbar-utils";

describe("parseFontSizePt", () => {
  it("parses pt values", () => {
    expect(parseFontSizePt("11pt")).toBe(11);
    expect(parseFontSizePt("12.5pt")).toBe(13);
  });

  it("parses px as approximate pt", () => {
    expect(parseFontSizePt("16px")).toBe(12);
  });

  it("parses bare numbers as pt", () => {
    expect(parseFontSizePt("14")).toBe(14);
  });

  it("returns null for invalid input", () => {
    expect(parseFontSizePt("")).toBeNull();
    expect(parseFontSizePt("large")).toBeNull();
  });
});

describe("setFontSizePt", () => {
  it("clamps and calls setFontSize on chain", () => {
    const run = vi.fn(() => true);
    const setFontSize = vi.fn(() => ({ run }));
    const editor = {
      isDestroyed: false,
      getAttributes: () => ({}),
      chain: () => ({
        focus: () => ({ setFontSize }),
      }),
    } as unknown as Parameters<typeof setFontSizePt>[0];

    setFontSizePt(editor, 200);
    expect(setFontSize).toHaveBeenCalledWith(`${FONT_SIZE_MAX_PT}pt`);

    setFontSizePt(editor, 2);
    expect(setFontSize).toHaveBeenCalledWith(`${FONT_SIZE_MIN_PT}pt`);
  });
});

describe("getActiveStyleLabel", () => {
  it("returns Body for paragraph", () => {
    const editor = {
      isDestroyed: false,
      isActive: (name: string, attrs?: Record<string, unknown>) =>
        name === "paragraph" && !attrs,
      getAttributes: () => ({}),
    } as unknown as Parameters<typeof getActiveStyleLabel>[0];
    expect(getActiveStyleLabel(editor)).toBe("Body");
  });
});

describe("getFontSizePt", () => {
  it("falls back to body default when no mark", () => {
    const editor = {
      isDestroyed: false,
      getAttributes: () => ({}),
    } as unknown as Parameters<typeof getFontSizePt>[0];
    expect(getFontSizePt(editor)).toBe(11);
  });

  it("reads fontSize from textStyle", () => {
    const editor = {
      isDestroyed: false,
      getAttributes: () => ({ fontSize: "14pt" }),
    } as unknown as Parameters<typeof getFontSizePt>[0];
    expect(getFontSizePt(editor)).toBe(14);
  });
});
