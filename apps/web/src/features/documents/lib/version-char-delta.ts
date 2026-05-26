export function formatCharDelta(delta: number | null | undefined): string | null {
  if (delta == null) return null;
  if (delta === 0) return "No text changes";
  const approxWords = Math.max(1, Math.round(Math.abs(delta) / 5));
  if (delta > 0) return `+${approxWords} characters`;
  return `-${approxWords} characters`;
}
