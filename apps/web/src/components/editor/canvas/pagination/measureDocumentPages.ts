import type { Node as ProseNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import {
  buildGridPageTops,
  PAGE_GAP_PX,
  type PageSetup,
} from "../pageSetup";

export const PAGE_BREAK_NODE_NAME = "pageBreakBlock";

export interface PageBreakSpacer {
  pos: number;
  spacerHeight: number;
}

export interface PageMeasureResult {
  pageCount: number;
  /** Doc positions where a new page starts (includes 1 for first page). */
  pageStarts: number[];
  /** Canvas Y offset for each page sheet (fixed grid). */
  pageTops: number[];
  /** Spacers inserted before content that starts a new page. */
  pageBreaks: PageBreakSpacer[];
}

const DEFAULT_BLOCK_HEIGHT = 24;

function blockHeight(view: EditorView, pos: number): number {
  const dom = view.nodeDOM(pos);
  if (dom instanceof HTMLElement) {
    return dom.offsetHeight || DEFAULT_BLOCK_HEIGHT;
  }
  return DEFAULT_BLOCK_HEIGHT;
}

function spacerBeforeNewPage(runningHeight: number, contentHeight: number): number {
  const fill = Math.max(0, contentHeight - runningHeight);
  return fill + PAGE_GAP_PX;
}

/**
 * Walks top-level blocks, honors hard page breaks, and estimates soft breaks by content height.
 */
export function measureDocumentPages(
  view: EditorView,
  contentHeight: number,
  pageSetup?: PageSetup,
): PageMeasureResult {
  const { doc } = view.state;
  const pageStarts: number[] = [1];
  const pageBreaks: PageBreakSpacer[] = [];
  let runningHeight = 0;
  let pageCount = 1;

  doc.forEach((node: ProseNode, offset: number) => {
    const pos = offset + 1;

    if (node.type.name === PAGE_BREAK_NODE_NAME) {
      if (runningHeight > 0) {
        pageBreaks.push({
          pos,
          spacerHeight: spacerBeforeNewPage(runningHeight, contentHeight),
        });
      } else if (pageCount > 0) {
        pageBreaks.push({ pos, spacerHeight: PAGE_GAP_PX });
      }
      pageCount += 1;
      runningHeight = 0;
      pageStarts.push(pos);
      return;
    }

    if (!node.isBlock) return;

    const height = blockHeight(view, pos);
    if (runningHeight > 0 && runningHeight + height > contentHeight) {
      pageBreaks.push({
        pos,
        spacerHeight: spacerBeforeNewPage(runningHeight, contentHeight),
      });
      pageCount += 1;
      runningHeight = 0;
      pageStarts.push(pos);
    }

    runningHeight += height;
  });

  if (pageCount < 1) pageCount = 1;

  const pageTops = pageSetup
    ? buildGridPageTops(pageCount, pageSetup)
    : Array.from({ length: pageCount }, (_, i) => i * (contentHeight + PAGE_GAP_PX));

  return { pageCount, pageStarts, pageTops, pageBreaks };
}
