import { useEffect, useMemo } from "react";
import { useEditor, type Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import * as Y from "yjs";
import {
  buildVersionPreviewExtensions,
  VERSION_PREVIEW_PROSE_CLASS,
} from "@/features/documents/lib/build-version-preview-extensions";
import { createPmDocFromYjsState } from "@/features/documents/lib/version-diff/create-pm-doc-from-yjs";
import { VersionDiffExtension } from "@/features/documents/lib/version-diff/version-diff-extension";
import {
  getChangesBetween,
  summarizeVersionDiff,
  type VersionDiffSummary,
} from "@/features/documents/lib/version-diff/version-diff-decorations";

export type VersionPreviewOptions = {
  baselineYjsState?: Uint8Array;
  showDiff?: boolean;
};

export function useVersionPreviewEditor(
  versionId: string,
  yjsState: Uint8Array,
  options?: VersionPreviewOptions,
): { editor: Editor | null; diffSummary: VersionDiffSummary | null; diffFailed: boolean } {
  const showDiff = options?.showDiff ?? false;
  const baselineYjsState = options?.baselineYjsState;

  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    if (yjsState.byteLength > 0) {
      Y.applyUpdate(doc, yjsState);
    }
    return doc;
  }, [versionId, yjsState]);

  useEffect(() => () => ydoc.destroy(), [ydoc]);

  const baselinePm = useMemo(() => {
    if (!showDiff || !baselineYjsState || baselineYjsState.byteLength === 0) {
      return null;
    }
    return createPmDocFromYjsState(baselineYjsState);
  }, [showDiff, baselineYjsState, versionId]);

  useEffect(() => () => baselinePm?.destroy(), [baselinePm]);

  const diffFailed = useMemo(() => {
    if (!baselinePm || !showDiff) return false;
    const previewPm = createPmDocFromYjsState(yjsState);
    try {
      return getChangesBetween(baselinePm.doc, previewPm.doc).failed;
    } finally {
      previewPm.destroy();
    }
  }, [baselinePm, showDiff, yjsState, versionId]);

  const diffSummary = useMemo((): VersionDiffSummary | null => {
    if (!baselinePm || !showDiff || diffFailed) return null;
    const previewPm = createPmDocFromYjsState(yjsState);
    try {
      return summarizeVersionDiff(baselinePm.doc, previewPm.doc);
    } finally {
      previewPm.destroy();
    }
  }, [baselinePm, showDiff, yjsState, versionId, diffFailed]);

  const extensions = useMemo(() => {
    const base = buildVersionPreviewExtensions(ydoc);
    if (baselinePm && showDiff && !diffFailed) {
      return [
        ...base,
        VersionDiffExtension.configure({
          baselineDoc: baselinePm.doc,
          enabled: true,
        }),
      ];
    }
    return base;
  }, [ydoc, baselinePm, showDiff, diffFailed]);

  const editor = useEditor(
    {
      extensions,
      editable: false,
      autofocus: false,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: VERSION_PREVIEW_PROSE_CLASS,
        },
      },
      onCreate: ({ editor: created }) => {
        try {
          created.commands.setTextSelection(0);
        } catch {
          created.commands.focus("start");
        }
      },
    },
    [extensions],
  );

  return { editor, diffSummary, diffFailed };
}

export { EditorContent as VersionPreviewEditorContent };
