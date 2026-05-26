import { Loader2 } from "lucide-react";

type DocumentLoadingOverlayProps = {
  progress: number;
  title?: string;
  statusLabelOverride?: string;
};

export function DocumentLoadingOverlay({
  progress,
  title = "Loading document…",
  statusLabelOverride,
}: DocumentLoadingOverlayProps) {
  const clamped = Math.min(100, Math.max(0, progress));
  const statusLabel =
    statusLabelOverride ??
    (clamped < 50 ? "Connecting…" : clamped < 100 ? "Syncing content…" : "Almost ready…");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div
          className="mb-2 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{statusLabel}</p>
      </div>
    </div>
  );
}
