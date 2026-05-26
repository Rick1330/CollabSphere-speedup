import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { DocumentVersion } from "@/api/adapters/documents";
import {
  formatCharDelta,
  reasonBadgeClass,
  reasonBadgeLabel,
} from "@/features/documents/lib/version-history-format";
import type { VersionDiffSummary } from "@/features/documents/lib/version-diff/version-diff-decorations";
import { cn } from "@/lib/utils";

function formatDiffSummary(summary: VersionDiffSummary | null): string | null {
  if (!summary) return null;
  const parts: string[] = [];
  if (summary.insertions > 0) parts.push(`${summary.insertions} insertion(s)`);
  if (summary.deletions > 0) parts.push(`${summary.deletions} deletion(s)`);
  if (summary.modifications > 0) parts.push(`${summary.modifications} modification(s)`);
  if (parts.length === 0) return "No structural changes detected";
  return parts.join(", ");
}

export function VersionHistoryDetailPanel({
  version,
  authorDisplay,
  diffSummary,
  showChanges,
  compareWithCurrent,
  isDualPane,
  canRestore,
  naming,
  nameInput,
  onNameInputChange,
  onToggleNaming,
  onSaveName,
  onCancelNaming,
  onToggleShowChanges,
  onToggleCompareCurrent,
  onToggleDualPane,
  onRestore,
  onSaveSnapshot,
}: {
  version: DocumentVersion;
  authorDisplay: string;
  diffSummary: VersionDiffSummary | null;
  showChanges: boolean;
  compareWithCurrent: boolean;
  isDualPane: boolean;
  canRestore: boolean;
  naming: boolean;
  nameInput: string;
  onNameInputChange: (value: string) => void;
  onToggleNaming: () => void;
  onSaveName: () => void;
  onCancelNaming: () => void;
  onToggleShowChanges: () => void;
  onToggleCompareCurrent: () => void;
  onToggleDualPane: () => void;
  onRestore: () => void;
  onSaveSnapshot: () => void;
}) {
  const diffLabel = formatDiffSummary(diffSummary);

  return (
    <aside className="flex w-[320px] shrink-0 flex-col border-l border-stone-200 bg-white">
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm font-semibold text-stone-900">Version details</p>
        <div className="mt-3 space-y-3 text-xs text-stone-700">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              Created
            </p>
            <p className="mt-0.5">
              {format(parseISO(version.createdAt), "MMM d, yyyy · h:mm a")}
            </p>
            <p className="text-stone-600">{authorDisplay}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              Reason
            </p>
            <span
              className={cn(
                "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                reasonBadgeClass(version.reason),
              )}
            >
              {reasonBadgeLabel(version.reason)}
            </span>
          </div>
          {version.versionLabel ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Name
              </p>
              <p className="mt-0.5 font-medium text-teal-800">{version.versionLabel}</p>
            </div>
          ) : null}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              Changes vs baseline
            </p>
            <p className="mt-0.5">{formatCharDelta(version.wordDelta) ?? "—"}</p>
            {diffLabel ? <p className="mt-1 text-stone-500">{diffLabel}</p> : null}
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t border-stone-100 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            View options
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-700">
            <input
              type="checkbox"
              checked={showChanges}
              onChange={onToggleShowChanges}
              className="rounded border-stone-300"
            />
            Show change highlights
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-700">
            <input
              type="checkbox"
              checked={compareWithCurrent}
              onChange={onToggleCompareCurrent}
              className="rounded border-stone-300"
            />
            Compare with current document
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-stone-700">
            <input
              type="checkbox"
              checked={isDualPane}
              onChange={onToggleDualPane}
              className="rounded border-stone-300"
            />
            Side-by-side compare
          </label>
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-stone-200 p-4">
        {canRestore && (
          <button
            type="button"
            onClick={onRestore}
            disabled={version.isLatest}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-teal-600 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Restore This Version
          </button>
        )}
        <button
          type="button"
          onClick={onSaveSnapshot}
          className="inline-flex h-9 w-full items-center justify-center rounded-md border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Save Current as Version
        </button>
        <button
          type="button"
          onClick={onToggleNaming}
          className="inline-flex h-9 w-full items-center justify-center rounded-md border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          {version.versionLabel ? "Rename Version" : "Name This Version"}
        </button>
        <button
          type="button"
          onClick={() => toast.info("Make a copy is not available yet.")}
          className="inline-flex h-9 w-full items-center justify-center rounded-md border border-stone-200 bg-white text-sm font-medium text-stone-500 hover:bg-stone-50"
        >
          Make a Copy
        </button>

        {naming && (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => onNameInputChange(e.target.value)}
              placeholder="Enter a name for this version"
              className="h-9 w-full rounded-md border border-stone-200 px-3 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSaveName}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-md bg-stone-800 text-sm font-medium text-white hover:bg-stone-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancelNaming}
                className="text-sm text-stone-500 hover:text-stone-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
