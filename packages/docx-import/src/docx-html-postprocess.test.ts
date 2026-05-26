import { describe, expect, it } from "vitest";
import { postProcessImportHtml } from "./docx-html-postprocess.js";
import type { DocumentStructure, WordParagraphStyle } from "./docx-types.js";
import { DEFAULT_PAGE_SETUP } from "./page-setup.js";

const defaultStyle: WordParagraphStyle = {
  id: "Normal",
  name: "Normal",
  fontSizePt: 11,
  lineHeight: 1.15,
  fontFamily: "Carlito",
  spacingBeforePx: 0,
  spacingAfterPx: 0,
};

function makeStructure(overrides?: Partial<WordParagraphStyle>): DocumentStructure {
  const style = { ...defaultStyle, ...overrides };
  return {
    pageSetup: DEFAULT_PAGE_SETUP,
    styles: new Map([["Normal", style]]),
    defaultStyle: style,
    warnings: [],
    mammothStyleMap: [],
  };
}

describe("postProcessImportHtml", () => {
  it("applies Word line height and zero margin to paragraphs", () => {
    const html = '<p class="word-Normal">Hello</p>';
    const structure = makeStructure();
    structure.styles.set("Normal", { ...defaultStyle, id: "Normal" });

    const out = postProcessImportHtml(html, structure);
    expect(out).toMatch(/line-height:\s*1\.15/);
    expect(out).toMatch(/font-size:\s*11pt/);
    expect(out).toMatch(/margin-bottom:\s*0/);
  });

  it("rescales table width when value looks like twips", () => {
    const html = '<table style="width: 5000px"><tr><td>x</td></tr></table>';
    const out = postProcessImportHtml(html, makeStructure());
    expect(out).toContain("333px");
    expect(out).not.toContain("5000px");
  });

  it("rescales image dimensions when value looks like EMUs", () => {
    const html = '<img width="914400" height="914400" src="x" />';
    const out = postProcessImportHtml(html, makeStructure());
    expect(out).toContain('width="96"');
  });
});
