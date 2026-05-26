import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Circle,
  CloudOff,
  Loader2,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/components/ui-kit";
import { relativeTime } from "@/lib/format";
import { useEditorCounts } from "@/features/documents/components/editor/editor-footer-utils";
import { EditorZoomControls } from "@/features/documents/components/editor/editor-zoom-controls";
import { usePaginationPageLabel } from "@/features/documents/hooks/use-pagination-page-label";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";
export type ConnectionStatus = "connected" | "connecting" | "reconnecting" | "offline";

export type StatusBarProps = {
  editor: Editor | null;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  connectionStatus: ConnectionStatus;
  collaboratorCount: number;
  isReadOnly?: boolean;
  onOpenTeam?: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  /** @deprecated Use onFitWidth */
  onFitToPage?: () => void;
  className?: string;
  submissionStatus?: {
    label: string;
    tone: "warning" | "danger" | "success" | "neutral";
    versionLabel?: string;
  };
};

function Dot({ className }: { className: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      aria-hidden
    />
  );
}

function SaveIndicator({
  saveStatus,
  lastSavedAt,
  connectionStatus,
}: {
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  connectionStatus: ConnectionStatus;
}) {
  if (saveStatus === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        <span>Saving…</span>
      </span>
    );
  }

  if (saveStatus === "unsaved") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--warning-600)]">
        <Circle className="h-2 w-2 fill-current" aria-hidden />
        <span>Unsaved</span>
      </span>
    );
  }

  if (saveStatus === "error") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--danger-600)]">
        <AlertCircle className="h-3 w-3" aria-hidden />
        <span>Save failed</span>
      </span>
    );
  }

  if (saveStatus === "saved" && connectionStatus === "offline") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--warning-700)]">
        <CloudOff className="h-3 w-3" aria-hidden />
        <span>Will sync when online</span>
      </span>
    );
  }

  if (saveStatus === "saved" && connectionStatus === "connected") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--success-600)]">
        <Check className="h-3 w-3" aria-hidden />
        <span>Saved</span>
        {lastSavedAt && (
          <span className="hidden text-[var(--text-tertiary)] lg:inline">
            · {relativeTime(lastSavedAt)}
          </span>
        )}
      </span>
    );
  }

  if (saveStatus === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
        <Check className="h-3 w-3" aria-hidden />
        <span>Saved locally</span>
      </span>
    );
  }

  return null;
}

function CollabLiveIndicator({
  connectionStatus,
  collaboratorCount,
  onOpenTeam,
}: {
  connectionStatus: ConnectionStatus;
  collaboratorCount: number;
  onOpenTeam?: () => void;
}) {
  const label = `Live (${collaboratorCount})`;

  let dotClass = "bg-[var(--danger-500)]";
  let textClass = "text-[var(--danger-600)]";
  if (connectionStatus === "connected") {
    dotClass = collaboratorCount > 1 ? "bg-[var(--success-500)]" : "bg-[var(--warning-400)]";
    textClass =
      collaboratorCount > 1 ? "text-[var(--success-700)]" : "text-[var(--warning-700)]";
  } else if (connectionStatus === "connecting" || connectionStatus === "reconnecting") {
    dotClass = "bg-[var(--warning-400)]";
    textClass = "text-[var(--warning-700)]";
  }

  const content = (
    <>
      <Dot className={dotClass} />
      <span>{label}</span>
      {(connectionStatus === "connecting" || connectionStatus === "reconnecting") && (
        <Loader2 className="h-3 w-3 animate-spin opacity-70" aria-hidden />
      )}
    </>
  );

  if (onOpenTeam) {
    return (
      <button
        type="button"
        onClick={onOpenTeam}
        title="Open team panel"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[length:var(--text-xs-size)] font-medium transition-colors",
          "hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--brand-500)]",
          textClass,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[length:var(--text-xs-size)] font-medium", textClass)}>
      {content}
    </span>
  );
}

export function StatusBar({
  editor,
  saveStatus,
  lastSavedAt,
  connectionStatus,
  collaboratorCount,
  isReadOnly = false,
  onOpenTeam,
  onFitWidth,
  onFitPage,
  onFitToPage,
  className,
  submissionStatus,
}: StatusBarProps) {
  const [relativeTick, setRelativeTick] = useState(0);
  const { words, chars } = useEditorCounts(editor);
  const pageLabel = usePaginationPageLabel(editor);

  useEffect(() => {
    if (!lastSavedAt) return;
    const t = globalThis.setInterval(() => setRelativeTick((n) => n + 1), 30_000);
    return () => globalThis.clearInterval(t);
  }, [lastSavedAt]);

  const submissionTone = submissionStatus?.tone ?? "neutral";
  const submissionTextClass =
    submissionTone === "success"
      ? "text-[var(--success-600)]"
      : submissionTone === "danger"
        ? "text-[var(--danger-600)]"
        : submissionTone === "warning"
          ? "text-[var(--warning-700)]"
          : "text-[var(--text-tertiary)]";

  return (
    <div
      className={cn(
        "editor-print-hide relative z-20 grid h-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span
          className="shrink-0 text-[length:var(--text-xs-size)] text-[var(--text-secondary)]"
          title="Page count from canvas layout"
        >
          {pageLabel}
        </span>
        <span className="text-[var(--text-tertiary)]" aria-hidden>
          ·
        </span>
        <span
          className="truncate text-[length:var(--text-xs-size)] text-[var(--text-tertiary)]"
          title={`${chars.toLocaleString()} characters`}
          aria-live="polite"
        >
          {words.toLocaleString()} {words === 1 ? "word" : "words"}
        </span>
        <span className="text-[var(--text-tertiary)]" aria-hidden>
          ·
        </span>
        <div role="status" aria-live="polite" className="shrink-0 text-[length:var(--text-xs-size)]" key={relativeTick}>
          <SaveIndicator
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            connectionStatus={connectionStatus}
          />
        </div>

        {submissionStatus ? (
          <div
            className={cn(
              "hidden items-center gap-2 rounded-md border border-[var(--border-subtle)] px-2 py-0.5 sm:inline-flex",
              submissionTextClass,
            )}
            role="status"
            aria-live="polite"
            title="Submission status"
          >
            <span className="text-[length:var(--text-xs-size)] font-medium">{submissionStatus.label}</span>
            {submissionStatus.versionLabel ? (
              <span className="text-[var(--text-tertiary)]">{submissionStatus.versionLabel}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex justify-center">
        <CollabLiveIndicator
          connectionStatus={connectionStatus}
          collaboratorCount={collaboratorCount}
          onOpenTeam={onOpenTeam}
        />
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
        {!isReadOnly && (
          <span className="hidden text-[length:var(--text-xs-size)] text-[var(--text-muted)] sm:inline">
            Editing
          </span>
        )}
        <button
          type="button"
          disabled
          title="Language picker (coming soon)"
          className="hidden rounded-md px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] sm:inline-flex"
        >
          EN
        </button>
        <div className="hidden h-4 w-px bg-[var(--border-subtle)] sm:block" aria-hidden />
        <EditorZoomControls
          onFitWidth={onFitWidth ?? onFitToPage}
          onFitPage={onFitPage}
        />
      </div>
    </div>
  );
}
