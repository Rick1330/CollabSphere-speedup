import { getPageContentBox, type PageSetup } from "./pageSetup";

export interface RulerProps {
  pageSetup: PageSetup;
  zoomLevel: number;
  className?: string;
}

const TICK_INTERVAL_PX = 48;

export function Ruler({ pageSetup, zoomLevel, className }: RulerProps) {
  const { pageWidth, margins } = getPageContentBox(pageSetup);
  const scale = zoomLevel / 100;
  const width = pageWidth * scale;
  const leftMargin = margins.left * scale;
  const rightMargin = margins.right * scale;
  const tickCount = Math.ceil(pageWidth / TICK_INTERVAL_PX);

  return (
    <div
      className={className}
      role="presentation"
      aria-hidden
      style={{ width: `${width}px` }}
    >
      <div className="cs-ruler-track relative mx-auto h-6 overflow-hidden rounded-t-sm bg-[var(--surface-1)] border border-b-0 border-[var(--border-subtle)]">
        <div
          className="absolute inset-y-0 bg-[var(--surface-inset)] opacity-60"
          style={{ left: 0, width: leftMargin }}
        />
        <div
          className="absolute inset-y-0 bg-[var(--surface-inset)] opacity-60"
          style={{ right: 0, width: rightMargin }}
        />
        <div className="relative flex h-full items-end px-0">
          {Array.from({ length: tickCount + 1 }, (_, i) => (
            <div
              key={i}
              className="cs-ruler-tick flex-1 border-l border-[var(--border-default)]"
              style={{ minWidth: TICK_INTERVAL_PX * scale }}
            >
              {i % 2 === 0 ? (
                <span className="block pb-0.5 pl-0.5 text-[9px] text-[var(--text-muted)] tabular-nums">
                  {i}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
