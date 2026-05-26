import { Check, Circle, CloudOff, Loader2 } from "lucide-react";
import { cn } from "@/components/ui-kit/cn";
import type { ConnectionStatus, SaveStatus } from "./StatusBar";

export type DocPillProps = {
  saveStatus: SaveStatus;
  connectionStatus: ConnectionStatus;
  collaboratorCount?: number;
  className?: string;
};

/**
 * Canonical document sync state chip for the top bar (spec §6.1).
 */
export function DocPill({
  saveStatus,
  connectionStatus,
  collaboratorCount = 0,
  className,
}: DocPillProps) {
  const peersPresent = collaboratorCount > 1;
  const isLive =
    connectionStatus === "connected" && saveStatus !== "error" && peersPresent;

  if (saveStatus === "saving") {
    return (
      <span
        className={cn("cs-doc-pill cs-doc-pill--saving", className)}
        role="status"
        aria-live="polite"
      >
        <Loader2 size={12} className="cs-doc-pill__spin" aria-hidden />
        Saving…
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <span className={cn("cs-doc-pill cs-doc-pill--danger", className)} role="status">
        <Circle size={8} className="cs-doc-pill__dot" aria-hidden />
        Save failed
      </span>
    );
  }

  if (connectionStatus === "offline" || (saveStatus === "unsaved" && connectionStatus !== "connected")) {
    return (
      <span className={cn("cs-doc-pill cs-doc-pill--warning", className)} role="status">
        <CloudOff size={12} aria-hidden />
        Offline — changes queued
      </span>
    );
  }

  if (saveStatus === "unsaved") {
    return (
      <span className={cn("cs-doc-pill cs-doc-pill--warning", className)} role="status">
        <Circle size={8} className="cs-doc-pill__dot" aria-hidden />
        Unsaved
      </span>
    );
  }

  if (isLive) {
    return (
      <span className={cn("cs-doc-pill cs-doc-pill--live", className)} role="status">
        <Circle size={8} className="cs-doc-pill__dot cs-doc-pill__dot--pulse" aria-hidden />
        Live
      </span>
    );
  }

  return (
    <span className={cn("cs-doc-pill cs-doc-pill--saved", className)} role="status">
      <Check size={12} aria-hidden />
      Saved
    </span>
  );
}
