/**
 * Shown while a lazy-loaded route chunk is downloading (Vite dev / code-split prod).
 */
export function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-[40vh] flex-1 items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
    </div>
  );
}
