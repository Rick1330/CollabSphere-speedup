import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateJSON } from "@tiptap/html";
import { getDocxImportExtensions } from "./docx-import-extensions";
import { htmlToTipTapWithCorrections } from "./docx-html-to-tiptap";
import { DEFAULT_PAGE_SETUP } from "@/components/editor/canvas/pageSetup";
import type { DocumentStructure } from "./docx-types";

vi.mock("mammoth", () => ({
  default: {
    convertToHtml: vi.fn(async () => ({
      value: '<p class="word-Normal">Body</p>',
      messages: [],
    })),
  },
}));

vi.mock("./docx-ooxml", () => ({
  parseDocumentStructure: vi.fn(async () => ({
    pageSetup: DEFAULT_PAGE_SETUP,
    styles: new Map(),
    defaultStyle: {
      id: "Normal",
      name: "Normal",
      fontSizePt: 11,
      lineHeight: 1.15,
      fontFamily: "Carlito",
      spacingBeforePx: 0,
      spacingAfterPx: 0,
    },
    warnings: [],
    mammothStyleMap: ["p[style-name='Normal'] => p.word-Normal:fresh"],
  })),
}));

describe("docx import pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generateJSON produces heading and paragraph nodes from HTML", () => {
    const json = generateJSON(
      "<h1>Title</h1><p>Body</p>",
      getDocxImportExtensions(),
    );
    const types = (json.content ?? []).map((n) => n.type);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
  });

  it("htmlToTipTapWithCorrections applies lineHeight on paragraphs", () => {
    const structure: DocumentStructure = {
      pageSetup: DEFAULT_PAGE_SETUP,
      styles: new Map(),
      defaultStyle: {
        id: "Normal",
        name: "Normal",
        fontSizePt: 11,
        lineHeight: 1.15,
        fontFamily: "Carlito",
        spacingBeforePx: 0,
        spacingAfterPx: 0,
      },
      warnings: [],
      mammothStyleMap: [],
    };
    const html =
      '<p style="font-size: 11pt; line-height: 1.15">Hello</p>';
    const json = htmlToTipTapWithCorrections(html, structure);
    const para = json.content?.find((n) => n.type === "paragraph");
    expect(para?.attrs?.lineHeight).toBe("1.15");
  });

  it("importDocxFile returns content and pageSetup", async () => {
    const { importDocxFile } = await import("./docx-import");
    const file = {
      name: "sample.docx",
      size: 1024,
      arrayBuffer: async () => new Uint8Array([0x50, 0x4b, 0x03, 0x04]).buffer,
    } as unknown as File;
    const result = await importDocxFile(file);
    expect(result.pageSetup.format).toBe("a4");
    expect(result.content.type).toBe("doc");
    expect((result.content.content ?? []).length).toBeGreaterThan(0);
  });
});
