export const TWIPS_PER_INCH = 1440;
export const PT_PER_INCH = 72;
export const PX_PER_INCH = 96;
export const EMU_PER_INCH = 914400;

export function twipsToPixels(twips: number): number {
  return (twips / TWIPS_PER_INCH) * PX_PER_INCH;
}

export function twipsToPoints(twips: number): number {
  return (twips / TWIPS_PER_INCH) * PT_PER_INCH;
}

export function pointsToPixels(pt: number): number {
  return (pt / PT_PER_INCH) * PX_PER_INCH;
}

export function pixelsToPoints(px: number): number {
  return (px / PX_PER_INCH) * PT_PER_INCH;
}

export function emusToPixels(emus: number): number {
  return (emus / EMU_PER_INCH) * PX_PER_INCH;
}

export function halfPointsToPoints(halfPoints: number): number {
  return halfPoints / 2;
}

export const LIKELY_TWIPS_THRESHOLD = 2000;
export const LIKELY_EMU_THRESHOLD = 10_000;
