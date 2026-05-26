import {
  getCanvasStackHeight,
  getPageContentBox,
  getPageSlotTop,
  type PageSetup,
} from "./pageSetup";

export interface PageSheetStackProps {
  pageCount: number;
  pageTops: number[];
  pageSetup: PageSetup;
}

export function PageSheetStack({ pageCount, pageTops, pageSetup }: PageSheetStackProps) {
  const { pageWidth, pageHeight } = getPageContentBox(pageSetup);
  const count = Math.max(1, pageCount, pageTops.length);
  const stackHeight = getCanvasStackHeight(count, pageSetup);

  return (
    <div
      className="cs-page-sheet-stack pointer-events-none absolute inset-x-0 top-0 z-0"
      style={{ height: stackHeight, width: pageWidth, margin: "0 auto" }}
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => {
        const pageIndex = index + 1;
        const top = pageTops[index] ?? getPageSlotTop(pageIndex, pageSetup);
        return (
          <div
            key={pageIndex}
            className="cs-page-sheet"
            style={{
              top,
              width: pageWidth,
              height: pageHeight,
            }}
            data-page-index={pageIndex}
          />
        );
      })}
    </div>
  );
}
