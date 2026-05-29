import { describe, expect, it } from "vitest";
import type { ExportBlock } from "./export-blocks.js";
import { paginateExportBlocks } from "./paginate-blocks.js";
import { DEFAULT_PAGE_SETUP, getPageContentBox } from "./page-setup.js";

describe("paginateExportBlocks", () => {
  it("splits blocks across pages when content exceeds page height", () => {
    const { contentHeight } = getPageContentBox(DEFAULT_PAGE_SETUP);
    const tallBlock: ExportBlock = {
      kind: "html",
      html: "<p>block</p>",
      estimatedHeightPx: contentHeight - 10,
    };
    const blocks: ExportBlock[] = [tallBlock, tallBlock, tallBlock];
    const pages = paginateExportBlocks(blocks, DEFAULT_PAGE_SETUP);
    expect(pages.length).toBeGreaterThanOrEqual(2);
  });

  it("starts a new page on pageBreak blocks", () => {
    const blocks: ExportBlock[] = [
      { kind: "html", html: "<p>a</p>", estimatedHeightPx: 24 },
      { kind: "pageBreak" },
      { kind: "html", html: "<p>b</p>", estimatedHeightPx: 24 },
    ];
    const pages = paginateExportBlocks(blocks, DEFAULT_PAGE_SETUP);
    expect(pages.length).toBe(2);
    expect(pages[0]).toContain("<p>a</p>");
    expect(pages[1]).toContain("<p>b</p>");
  });
});
