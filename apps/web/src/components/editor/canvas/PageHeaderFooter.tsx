import { cn } from "@/lib/utils";
import {
  substituteHeaderFooterTokens,
  useEditorStore,
  type PageHeaderFooter,
} from "@/features/documents/stores/use-editor-store";
import {
  DEFAULT_PAGE_SETUP,
  getPageContentBox,
  getPageSlotTop,
  type PageSetup,
} from "./pageSetup";

export interface PageHeaderFooterZonesProps {
  pageIndex: number;
  pageSetup: PageSetup;
  zoomLevel: number;
  totalPages: number;
}

function ZoneInput({
  value,
  placeholder,
  onChange,
  className,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full border-0 bg-transparent text-center text-[10px] text-[var(--text-muted)]",
        "opacity-0 transition-opacity group-hover/page:opacity-100 focus:opacity-100",
        "focus:outline-none focus:ring-1 focus:ring-[var(--border-focus)] rounded-sm",
        className,
      )}
    />
  );
}

export function PageHeaderFooterZones({
  pageIndex,
  pageSetup,
  zoomLevel: _zoomLevel,
  totalPages,
}: PageHeaderFooterZonesProps) {
  const { pageWidth, pageHeight } = getPageContentBox(pageSetup);
  const margins = pageSetup?.margins ?? DEFAULT_PAGE_SETUP.margins;
  const entry: PageHeaderFooter =
    useEditorStore((s) => s.headerFooterByPage[pageIndex]) ?? { header: "", footer: "" };
  const setPageHeaderFooter = useEditorStore((s) => s.setPageHeaderFooter);

  const displayHeader = substituteHeaderFooterTokens(
    entry.header || "",
    pageIndex,
    totalPages,
  );
  const displayFooter = substituteHeaderFooterTokens(
    entry.footer || "Page {page} of {total}",
    pageIndex,
    totalPages,
  );

  const style = {
    top: getPageSlotTop(pageIndex, pageSetup),
    width: pageWidth,
    height: pageHeight,
  } as React.CSSProperties;

  return (
    <div
      className="cs-page-chrome group/page pointer-events-none absolute left-0 right-0 mx-auto"
      style={style}
      data-page-index={pageIndex}
    >
      <div
        className="pointer-events-auto absolute left-0 right-0"
        style={{ top: margins.top * 0.25, left: margins.left, right: margins.right }}
      >
        <ZoneInput
          value={entry.header}
          placeholder={displayHeader || "Header"}
          onChange={(header) => setPageHeaderFooter(pageIndex, { header })}
        />
        {entry.header ? (
          <div className="mt-0.5 text-center text-[10px] text-[var(--text-muted)] group-hover/page:hidden">
            {displayHeader}
          </div>
        ) : null}
      </div>
      <div
        className="pointer-events-auto absolute left-0 right-0"
        style={{
          bottom: margins.bottom * 0.25,
          left: margins.left,
          right: margins.right,
        }}
      >
        <ZoneInput
          value={entry.footer}
          placeholder="Page {page} of {total}"
          onChange={(footer) => setPageHeaderFooter(pageIndex, { footer })}
        />
        <div className="mt-0.5 text-center text-[10px] text-[var(--text-muted)] group-hover/page:hidden">
          {displayFooter}
        </div>
      </div>
    </div>
  );
}
