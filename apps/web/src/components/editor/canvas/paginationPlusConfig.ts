import { PaginationPlus } from "tiptap-pagination-plus";
import {
  DEFAULT_PAGE_SETUP,
  getPageContentBox,
  PAGE_GAP_PX,
  type PageSetup,
} from "./pageSetup";

/** Matches `--surface-2` canvas behind stacked pages. */
const CANVAS_PAGE_GAP_BG = "#f1f3f4";

export const DEFAULT_PAGE_FOOTER_TEMPLATE = "Page {page}";

export function createPaginationPlusExtension(
  pageSetup: PageSetup = DEFAULT_PAGE_SETUP,
) {
  const { pageWidth, pageHeight } = getPageContentBox(pageSetup);
  const { margins } = pageSetup;

  return PaginationPlus.configure({
    enabled: true,
    pageWidth,
    pageHeight,
    pageGap: PAGE_GAP_PX,
    pageGapBorderSize: 0,
    pageGapBorderColor: "transparent",
    pageBreakBackground: CANVAS_PAGE_GAP_BG,
    marginTop: margins.top,
    marginBottom: margins.bottom,
    marginLeft: margins.left,
    marginRight: margins.right,
    contentMarginTop: 8,
    contentMarginBottom: 8,
    headerLeft: "",
    headerRight: "",
    footerLeft: "",
    footerRight: DEFAULT_PAGE_FOOTER_TEMPLATE,
    customHeader: {},
    customFooter: {},
  });
}
