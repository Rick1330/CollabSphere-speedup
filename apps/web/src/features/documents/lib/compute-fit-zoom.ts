import { ZOOM_MAX, ZOOM_MIN } from "@/features/documents/stores/use-editor-store";

const FIT_HORIZONTAL_PADDING_PX = 32;
const FIT_VERTICAL_PADDING_PX = 48;

function clampZoom(level: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(level)));
}

function naturalSize(
  outerEl: HTMLElement,
  pageEl: HTMLElement,
  currentZoom: number,
): { naturalWidth: number; naturalHeight: number } | null {
  const scale = currentZoom / 100;
  const rendered = pageEl.getBoundingClientRect();
  if (rendered.width <= 0 || rendered.height <= 0 || scale <= 0) return null;
  return {
    naturalWidth: rendered.width / scale,
    naturalHeight: rendered.height / scale,
  };
}

/**
 * Computes zoom % so the page column fits the scroll viewport width.
 */
export function computeFitWidthLevel(
  outerEl: HTMLElement,
  pageEl: HTMLElement,
  currentZoom: number,
): number {
  const sizes = naturalSize(outerEl, pageEl, currentZoom);
  if (!sizes) return 100;
  const availableWidth = Math.max(1, outerEl.clientWidth - FIT_HORIZONTAL_PADDING_PX);
  return clampZoom((availableWidth / sizes.naturalWidth) * 100);
}

/**
 * Computes zoom % so the full page height fits in the viewport.
 */
export function computeFitPageLevel(
  outerEl: HTMLElement,
  pageEl: HTMLElement,
  currentZoom: number,
): number {
  const sizes = naturalSize(outerEl, pageEl, currentZoom);
  if (!sizes) return 100;
  const availableHeight = Math.max(1, outerEl.clientHeight - FIT_VERTICAL_PADDING_PX);
  const widthFit = computeFitWidthLevel(outerEl, pageEl, currentZoom);
  const heightFit = clampZoom((availableHeight / sizes.naturalHeight) * 100);
  return clampZoom(Math.min(widthFit, heightFit));
}

/** @deprecated Use computeFitWidthLevel */
export function computeFitZoomLevel(
  outerEl: HTMLElement,
  pageEl: HTMLElement,
  currentZoom: number,
): number {
  return computeFitWidthLevel(outerEl, pageEl, currentZoom);
}
