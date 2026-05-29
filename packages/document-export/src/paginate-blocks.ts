import type { ExportBlock } from "./export-blocks.js";
import type { PageSetup } from "./page-setup.js";
import { getPageContentBox } from "./page-setup.js";

export function paginateExportBlocks(
  blocks: ExportBlock[],
  setup: PageSetup,
): string[][] {
  const { contentHeight } = getPageContentBox(setup);
  const pages: string[][] = [[]];
  let runningHeight = 0;

  for (const block of blocks) {
    if (block.kind === "pageBreak") {
      if (pages[pages.length - 1].length > 0) {
        pages.push([]);
      }
      runningHeight = 0;
      continue;
    }

    const height = block.estimatedHeightPx;
    if (runningHeight > 0 && runningHeight + height > contentHeight) {
      pages.push([]);
      runningHeight = 0;
    }

    const page = pages[pages.length - 1];
    page.push(block.html);
    runningHeight += height;
  }

  if (pages.length === 0 || (pages.length === 1 && pages[0].length === 0)) {
    return [["<p></p>"]];
  }

  return pages.filter((p) => p.length > 0);
}

export function pagesToBodyHtml(pages: string[][], setup: PageSetup): string {
  const { pageWidth, pageHeight } = getPageContentBox(setup);
  return pages
    .map(
      (pageHtml, index) =>
        `<div class="cs-export-page" data-page="${index + 1}" style="width:${pageWidth}px;min-height:${pageHeight}px;">${pageHtml.join("\n")}</div>`,
    )
    .join("\n");
}
