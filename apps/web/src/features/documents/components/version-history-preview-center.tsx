import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useVersionPreviewEditor,
  VersionPreviewEditorContent,
} from "@/features/documents/hooks/use-version-preview-editor";
import type { VersionDiffSummary } from "@/features/documents/lib/version-diff/version-diff-decorations";

function PlaintextPreviewFallback({ plaintext }: { plaintext: string }) {
  return (
    <div className="prose prose-stone max-w-none whitespace-pre-wrap text-sm text-stone-800">
      {plaintext}
    </div>
  );
}

function SinglePreview({
  versionId,
  yjsState,
  plaintext,
  baselineYjsState,
  showDiff,
  onDiffSummary,
  onDiffFailed,
}: {
  versionId: string;
  yjsState: Uint8Array;
  plaintext?: string;
  baselineYjsState?: Uint8Array;
  showDiff: boolean;
  onDiffSummary?: (summary: VersionDiffSummary | null) => void;
  onDiffFailed?: (failed: boolean) => void;
}) {
  const { editor, diffSummary, diffFailed } = useVersionPreviewEditor(versionId, yjsState, {
    baselineYjsState,
    showDiff: showDiff && Boolean(baselineYjsState?.byteLength),
  });

  useEffect(() => {
    onDiffSummary?.(diffSummary);
  }, [diffSummary, onDiffSummary]);

  useEffect(() => {
    onDiffFailed?.(diffFailed);
  }, [diffFailed, onDiffFailed]);

  if (yjsState.byteLength > 0) {
    if (!editor) {
      return (
        <div className="space-y-3 p-6" aria-busy="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      );
    }
    return (
      <div className="p-6">
        <VersionPreviewEditorContent editor={editor} />
      </div>
    );
  }

  if (plaintext?.trim()) {
    return (
      <div className="p-6">
        <PlaintextPreviewFallback plaintext={plaintext} />
      </div>
    );
  }

  return <p className="p-6 text-sm text-stone-500">No preview available.</p>;
}

export function VersionHistoryPreviewCenter({
  previewVersionId,
  previewYjsState,
  previewPlaintext,
  previewLabel,
  baselineYjsState,
  dualPaneLeftYjsState,
  dualPaneLeftLabel,
  dualPaneRightYjsState,
  dualPaneRightLabel,
  showDiff,
  isDualPane,
  isLoading,
  isError,
  diffUnavailableMessage,
  onDiffSummary,
  onDiffFailed,
}: {
  previewVersionId: string;
  previewYjsState: Uint8Array;
  previewPlaintext?: string;
  previewLabel?: string;
  baselineYjsState?: Uint8Array;
  dualPaneLeftYjsState?: Uint8Array;
  dualPaneLeftLabel?: string;
  dualPaneRightYjsState?: Uint8Array;
  dualPaneRightLabel?: string;
  showDiff: boolean;
  isDualPane: boolean;
  isLoading: boolean;
  isError: boolean;
  diffUnavailableMessage?: string | null;
  onDiffSummary?: (summary: VersionDiffSummary | null) => void;
  onDiffFailed?: (failed: boolean) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="min-h-[320px] flex-1 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="p-6 text-sm text-red-600">Could not load this version preview.</p>
    );
  }

  if (
    isDualPane &&
    dualPaneLeftYjsState &&
    dualPaneLeftYjsState.byteLength > 0 &&
    dualPaneRightYjsState &&
    dualPaneRightYjsState.byteLength > 0
  ) {
    return (
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-px bg-stone-200">
        <div className="flex min-h-0 flex-col bg-white">
          <p className="shrink-0 border-b border-stone-100 px-4 py-2 text-xs font-medium text-stone-500">
            {dualPaneLeftLabel ?? "Baseline"}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SinglePreview
              versionId={`${previewVersionId}-dual-left`}
              yjsState={dualPaneLeftYjsState}
              showDiff={false}
            />
          </div>
        </div>
        <div className="flex min-h-0 flex-col bg-white">
          <p className="shrink-0 border-b border-stone-100 px-4 py-2 text-xs font-medium text-stone-500">
            {dualPaneRightLabel ?? previewLabel ?? "Preview"}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SinglePreview
              versionId={`${previewVersionId}-dual-right`}
              yjsState={dualPaneRightYjsState}
              showDiff={false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[800px] py-6">
        <div className="rounded-xl border border-stone-200 bg-white px-8 py-8 shadow-sm">
          {previewLabel ? (
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-stone-400">
              {previewLabel}
            </p>
          ) : null}
          {diffUnavailableMessage ? (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {diffUnavailableMessage}
            </p>
          ) : null}
          {showDiff && !baselineYjsState?.byteLength ? (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No baseline available for highlights. Showing full snapshot.
            </p>
          ) : null}
          <SinglePreview
            versionId={previewVersionId}
            yjsState={previewYjsState}
            plaintext={previewPlaintext}
            baselineYjsState={baselineYjsState}
            showDiff={showDiff}
            onDiffSummary={onDiffSummary}
            onDiffFailed={onDiffFailed}
          />
        </div>
      </div>
    </div>
  );
}
