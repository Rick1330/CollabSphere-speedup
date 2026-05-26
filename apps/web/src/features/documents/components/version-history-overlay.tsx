import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createDocumentVersion,
  getDocumentVersionDetail,
  listDocumentVersions,
  restoreDocumentVersion,
  updateDocumentVersionLabel,
  type DocumentVersion,
} from "@/api/adapters/documents";
import { VersionHistoryDetailPanel } from "@/features/documents/components/version-history-detail-panel";
import { VersionHistoryPreviewCenter } from "@/features/documents/components/version-history-preview-center";
import type { VersionDiffSummary } from "@/features/documents/lib/version-diff/version-diff-decorations";
import { queryKeys } from "@/lib/query-keys";
import {
  formatCharDelta,
  formatVersionDetailLabel,
  formatVersionTime,
  groupVersionsByDay,
  reasonBadgeClass,
  reasonBadgeLabel,
} from "@/features/documents/lib/version-history-format";
import { VersionRestoreDialog } from "@/features/documents/components/version-restore-dialog";
import { ApiError } from "@/api/client";
import { useAuthBootstrap } from "@/lib/auth-bootstrap-context";

function getOlderVersion(
  versions: DocumentVersion[],
  selectedId: string,
): DocumentVersion | null {
  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const idx = sorted.findIndex((v) => v.id === selectedId);
  if (idx < 0) return null;
  return sorted[idx + 1] ?? null;
}

interface VersionHistoryOverlayProps {
  workspaceId: string;
  documentId: string;
  documentTitle: string;
  currentUserId: string;
  canRestore: boolean;
  getLiveYjsState?: () => Uint8Array;
  onClose: () => void;
  onRestored?: () => void;
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-3 w-3 rounded-full shrink-0 mt-1" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

function VersionTimelineItem({
  version,
  selected,
  currentUserId,
  onSelect,
}: {
  version: DocumentVersion;
  selected: boolean;
  currentUserId: string;
  onSelect: () => void;
}) {
  const delta = formatCharDelta(version.wordDelta);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
        selected ? "bg-teal-50 ring-1 ring-teal-200" : "hover:bg-[#F0FDFA]",
      )}
    >
      <div className="flex gap-2.5">
        <span
          className={cn(
            "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2",
            version.isLatest
              ? "border-teal-600 bg-teal-600"
              : "border-stone-300 bg-white",
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-stone-800">
              {formatVersionTime(version.createdAt)}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                reasonBadgeClass(version.reason),
              )}
            >
              {reasonBadgeLabel(version.reason)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-stone-600">
            {version.createdById === currentUserId ? "You" : version.createdByName}
            {version.versionLabel ? ` · ${version.versionLabel}` : ""}
          </p>
          {delta && <p className="mt-1 text-[11px] text-stone-500">{delta}</p>}
          {version.contentExcerpt ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-stone-400">
              {version.contentExcerpt}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export const VersionHistoryOverlay = ({
  workspaceId,
  documentId,
  documentTitle,
  currentUserId,
  canRestore,
  getLiveYjsState,
  onClose,
  onRestored,
}: VersionHistoryOverlayProps) => {
  const queryClient = useQueryClient();
  const { isSessionReady } = useAuthBootstrap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [naming, setNaming] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showChanges, setShowChanges] = useState(true);
  const [compareWithCurrent, setCompareWithCurrent] = useState(false);
  const [isDualPane, setIsDualPane] = useState(false);
  const [diffSummary, setDiffSummary] = useState<VersionDiffSummary | null>(null);
  const [diffFailed, setDiffFailed] = useState(false);
  const [liveYjsSnapshot, setLiveYjsSnapshot] = useState<Uint8Array>(() => new Uint8Array(0));

  const versionsQuery = useQuery({
    queryKey: queryKeys.documents.versions(workspaceId, documentId),
    queryFn: () => listDocumentVersions(workspaceId, documentId),
    enabled: isSessionReady,
  });

  const versions = versionsQuery.data ?? [];

  useEffect(() => {
    if (versions.length > 0 && !selectedId) {
      setSelectedId(versions[0]?.id ?? null);
    }
  }, [versions, selectedId]);

  useEffect(() => {
    setDiffFailed(false);
    setDiffSummary(null);
  }, [selectedId]);

  const selectedVersion = useMemo(
    () => versions.find((v) => v.id === selectedId) ?? null,
    [versions, selectedId],
  );

  const detailQuery = useQuery({
    queryKey: queryKeys.documents.versionDetail(
      workspaceId,
      documentId,
      selectedId ?? "",
    ),
    queryFn: () => getDocumentVersionDetail(workspaceId, documentId, selectedId!),
    enabled: Boolean(selectedId),
  });

  const grouped = useMemo(() => groupVersionsByDay(versions), [versions]);

  const olderVersion = useMemo(
    () => (selectedId ? getOlderVersion(versions, selectedId) : null),
    [versions, selectedId],
  );

  const baselineDetailQuery = useQuery({
    queryKey: queryKeys.documents.versionDetail(
      workspaceId,
      documentId,
      olderVersion?.id ?? "",
    ),
    queryFn: () =>
      getDocumentVersionDetail(workspaceId, documentId, olderVersion!.id),
    enabled: Boolean(olderVersion?.id && !compareWithCurrent),
  });

  const selectedYjsState = detailQuery.data?.yjsState ?? new Uint8Array(0);

  useEffect(() => {
    if (!compareWithCurrent) return;
    setLiveYjsSnapshot(getLiveYjsState?.() ?? new Uint8Array(0));
  }, [compareWithCurrent, selectedId, getLiveYjsState]);

  const previewYjsState = compareWithCurrent ? liveYjsSnapshot : selectedYjsState;
  const diffBaselineYjsState = compareWithCurrent
    ? selectedYjsState
    : baselineDetailQuery.data?.yjsState;

  const selectByOffset = useCallback(
    (delta: number) => {
      if (versions.length === 0) return;
      const idx = Math.max(
        0,
        Math.min(
          versions.findIndex((v) => v.id === selectedId) + delta,
          versions.length - 1,
        ),
      );
      setSelectedId(versions[idx]?.id ?? null);
    },
    [versions, selectedId],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        selectByOffset(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        selectByOffset(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, selectByOffset]);

  const handleRestore = async () => {
    if (!selectedId) return;
    setIsRestoring(true);
    // #region agent log
    fetch("http://127.0.0.1:7352/ingest/38fbd051-1833-4296-ab67-281907013a27", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "833b60",
      },
      body: JSON.stringify({
        sessionId: "833b60",
        hypothesisId: "G",
        location: "version-history-overlay.tsx:handleRestore",
        message: "restore clicked",
        data: { documentId, versionId: selectedId },
        timestamp: Date.now(),
        runId: "restore-debug",
      }),
    }).catch(() => {});
    // #endregion
    try {
      await restoreDocumentVersion(workspaceId, documentId, selectedId);
      // #region agent log
      fetch("http://127.0.0.1:7352/ingest/38fbd051-1833-4296-ab67-281907013a27", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "833b60",
        },
        body: JSON.stringify({
          sessionId: "833b60",
          hypothesisId: "G",
          location: "version-history-overlay.tsx:handleRestore",
          message: "restore API ok",
          data: { documentId, versionId: selectedId },
          timestamp: Date.now(),
          runId: "restore-debug",
        }),
      }).catch(() => {});
      // #endregion
      toast.success("Version restored");
      setRestoreOpen(false);
      onClose();
      onRestored?.();
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documents.versions(workspaceId, documentId),
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not restore this version";
      // #region agent log
      fetch("http://127.0.0.1:7352/ingest/38fbd051-1833-4296-ab67-281907013a27", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "833b60",
        },
        body: JSON.stringify({
          sessionId: "833b60",
          hypothesisId: "G",
          location: "version-history-overlay.tsx:handleRestore",
          message: "restore API failed",
          data: {
            documentId,
            versionId: selectedId,
            status: err instanceof ApiError ? err.status : null,
            code: err instanceof ApiError ? err.code : null,
            apiMessage: message,
          },
          timestamp: Date.now(),
          runId: "restore-debug",
        }),
      }).catch(() => {});
      // #endregion
      toast.error(message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      await createDocumentVersion(workspaceId, documentId);
      toast.success("Current document saved as a version");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documents.versions(workspaceId, documentId),
      });
    } catch {
      toast.error("Could not save a version snapshot");
    }
  };

  const handleSaveName = async () => {
    if (!selectedId || !nameInput.trim()) return;
    try {
      await updateDocumentVersionLabel(workspaceId, documentId, selectedId, nameInput.trim());
      toast.success("Version named");
      setNaming(false);
      setNameInput("");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.documents.versions(workspaceId, documentId),
      });
    } catch {
      toast.error("Could not name this version");
    }
  };

  const authorDisplay =
    selectedVersion?.createdById === currentUserId
      ? "You"
      : selectedVersion?.createdByName ?? "Unknown";

  return (
    <>
      <div
        className="absolute inset-0 z-[90] flex flex-col bg-white"
        role="dialog"
        aria-modal="true"
        aria-label="Version history"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to editing
          </button>
          <h2 className="min-w-0 truncate text-sm font-semibold text-stone-900">
            &ldquo;{documentTitle}&rdquo; — Version History
          </h2>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="w-[260px] shrink-0 overflow-y-auto border-r border-stone-200 bg-[#F9FAFB]">
            {versionsQuery.isLoading ? (
              <TimelineSkeleton />
            ) : versionsQuery.isError ? (
              <div className="space-y-3 p-4">
                <p className="text-xs text-red-600">Could not load version history.</p>
                <button
                  type="button"
                  onClick={() => void versionsQuery.refetch()}
                  className="text-xs font-medium text-teal-700 hover:text-teal-900"
                >
                  Retry
                </button>
              </div>
            ) : versions.length === 0 ? (
              <div className="space-y-2 p-4">
                <p className="text-xs leading-relaxed text-stone-500">
                  No version history yet. Versions are created automatically every 10 minutes
                  and when you submit for review.
                </p>
                {import.meta.env.DEV ? (
                  <p className="text-[10px] leading-relaxed text-stone-400">
                    Snapshots are created by the collab server when you edit. Ensure{" "}
                    <code className="rounded bg-stone-100 px-1">apps/collab</code> is running
                    with auto-version enabled (dev: ~60s after edits).
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4 p-2">
                {grouped.map((group) => (
                  <div key={group.label}>
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.versions.map((version) => (
                        <VersionTimelineItem
                          key={version.id}
                          version={version}
                          currentUserId={currentUserId}
                          selected={version.id === selectedId}
                          onSelect={() => setSelectedId(version.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <section className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-stone-50">
            {!selectedVersion ? (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-stone-500">
                Select a version to preview
              </div>
            ) : (
              <VersionHistoryPreviewCenter
                previewVersionId={
                  compareWithCurrent ? `${selectedId}-current` : selectedId!
                }
                previewYjsState={previewYjsState}
                previewPlaintext={
                  compareWithCurrent ? undefined : detailQuery.data?.plaintext
                }
                previewLabel={
                  compareWithCurrent
                    ? "Current document"
                    : formatVersionTime(selectedVersion.createdAt)
                }
                baselineYjsState={
                  showChanges && !diffFailed ? diffBaselineYjsState : undefined
                }
                dualPaneLeftYjsState={
                  isDualPane
                    ? compareWithCurrent
                      ? selectedYjsState
                      : baselineDetailQuery.data?.yjsState
                    : undefined
                }
                dualPaneLeftLabel={
                  compareWithCurrent
                    ? formatVersionTime(selectedVersion.createdAt)
                    : olderVersion
                      ? formatVersionTime(olderVersion.createdAt)
                      : "Older"
                }
                dualPaneRightYjsState={
                  isDualPane
                    ? compareWithCurrent
                      ? liveYjsSnapshot
                      : selectedYjsState
                    : undefined
                }
                dualPaneRightLabel={
                  compareWithCurrent
                    ? "Current document"
                    : formatVersionTime(selectedVersion.createdAt)
                }
                showDiff={showChanges}
                isDualPane={isDualPane}
                isLoading={Boolean(detailQuery.isLoading)}
                isError={detailQuery.isError}
                diffUnavailableMessage={
                  showChanges && diffFailed
                    ? "Could not compute inline diff for this comparison. Use side-by-side view or turn off highlights."
                    : null
                }
                onDiffSummary={setDiffSummary}
                onDiffFailed={setDiffFailed}
              />
            )}
          </section>

          {selectedVersion ? (
            <VersionHistoryDetailPanel
              version={selectedVersion}
              authorDisplay={authorDisplay}
              diffSummary={diffSummary}
              showChanges={showChanges}
              compareWithCurrent={compareWithCurrent}
              isDualPane={isDualPane}
              canRestore={canRestore}
              naming={naming}
              nameInput={nameInput}
              onNameInputChange={setNameInput}
              onToggleNaming={() => {
                setNaming((n) => !n);
                setNameInput(selectedVersion.versionLabel ?? "");
              }}
              onSaveName={handleSaveName}
              onCancelNaming={() => setNaming(false)}
              onToggleShowChanges={() => setShowChanges((v) => !v)}
              onToggleCompareCurrent={() => {
                setCompareWithCurrent((v) => {
                  const next = !v;
                  if (next) {
                    setLiveYjsSnapshot(getLiveYjsState?.() ?? new Uint8Array(0));
                    setIsDualPane(false);
                    setDiffFailed(false);
                  }
                  return next;
                });
              }}
              onToggleDualPane={() => {
                setIsDualPane((v) => {
                  const next = !v;
                  if (next) setCompareWithCurrent(false);
                  return next;
                });
              }}
              onRestore={() => setRestoreOpen(true)}
              onSaveSnapshot={handleSaveSnapshot}
            />
          ) : null}
        </div>

        {detailQuery.isFetching && selectedId && !detailQuery.isLoading && (
          <div className="pointer-events-none absolute right-4 top-20 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs text-stone-500 shadow">
            <Loader2 className="h-3 w-3 animate-spin" />
            Updating preview…
          </div>
        )}
      </div>

      {selectedVersion && (
        <VersionRestoreDialog
          open={restoreOpen}
          onOpenChange={setRestoreOpen}
          versionLabel={formatVersionDetailLabel(selectedVersion)}
          isRestoring={isRestoring}
          onConfirm={handleRestore}
        />
      )}
    </>
  );
};
