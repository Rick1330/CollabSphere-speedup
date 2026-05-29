import { useEffect, useMemo, useState } from "react";
import type { ToolbarGroupId } from "./toolbar-utils";

/** Spec §6.3: collapse right-to-left; these hide first (lowest priority). */
const HIDE_ORDER: ToolbarGroupId[] = [
  "styles",
  "character",
  "paragraph",
  "lists",
  "color",
  "font",
  "quickInsert",
  "insert",
  "clipboard",
  "history",
];

const WIDTH_THRESHOLDS: { minWidth: number; hideCount: number }[] = [
  { minWidth: 1440, hideCount: 0 },
  { minWidth: 1320, hideCount: 1 },
  { minWidth: 1200, hideCount: 2 },
  { minWidth: 1080, hideCount: 3 },
  { minWidth: 960, hideCount: 4 },
  { minWidth: 860, hideCount: 5 },
  { minWidth: 760, hideCount: 6 },
  { minWidth: 680, hideCount: 7 },
  { minWidth: 600, hideCount: 8 },
  { minWidth: 0, hideCount: HIDE_ORDER.length },
];

export function useToolbarOverflow(containerRef: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(1440);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [containerRef]);

  return useMemo(() => {
    for (const row of WIDTH_THRESHOLDS) {
      if (width >= row.minWidth) {
        return HIDE_ORDER.slice(0, row.hideCount);
      }
    }
    return HIDE_ORDER;
  }, [width]);
}
