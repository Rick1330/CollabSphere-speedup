import { useEffect, useRef } from "react";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import type { CommentThread } from "@/lib/mock-comments";
import {
  collectCommentMarkRanges,
  resolveSnippetToRange,
} from "@/features/documents/lib/comment-mark-ranges";

const PLUGIN_KEY = new PluginKey("doc-anchors");
const UPDATE_META_KEY = "doc-anchors:update";

interface UseAnchorDecorationsArgs {
  editor: Editor | null;
  threads: CommentThread[];
  activeThreadId: string | null;
  flashThreadId: string | null;
  onAnchorClick: (threadId: string) => void;
}

interface ThreadRange {
  threadId: string;
  from: number;
  to: number;
}

function resolveThreadRanges(
  editor: Editor,
  threads: CommentThread[],
): ThreadRange[] {
  const docSize = editor.state.doc.content.size;
  const docText = editor.state.doc.textBetween(0, docSize, "\n", " ");
  const ranges: ThreadRange[] = [];
  const usedThreadIds = new Set<string>();
  const usedRanges: Array<[number, number]> = [];

  for (const range of collectCommentMarkRanges(editor.state.doc)) {
    if (range.resolved) continue;
    if (usedThreadIds.has(range.threadId)) continue;
    usedThreadIds.add(range.threadId);
    ranges.push({ threadId: range.threadId, from: range.from, to: range.to });
    usedRanges.push([range.from, range.to]);
  }

  threads.forEach((t) => {
    if (!t.anchor || usedThreadIds.has(t.id) || t.resolved) return;

    const from = t.anchor.from;
    const to = t.anchor.to;
    if (
      typeof from === "number" &&
      typeof to === "number" &&
      from >= 0 &&
      to > from &&
      to <= docSize
    ) {
      usedThreadIds.add(t.id);
      ranges.push({ threadId: t.id, from, to });
      usedRanges.push([from, to]);
      return;
    }

    if (t.anchor.snippet) {
      const resolved = resolveSnippetToRange(editor, t.anchor.snippet, docText, usedRanges);
      if (resolved) {
        usedThreadIds.add(t.id);
        ranges.push({ threadId: t.id, from: resolved.from, to: resolved.to });
      }
    }
  });

  return ranges;
}

/**
 * Inline active/flash highlights for comment anchors (hover is CSS on marks).
 */
export function useAnchorDecorations({
  editor,
  threads,
  activeThreadId,
  flashThreadId,
  onAnchorClick,
}: UseAnchorDecorationsArgs) {
  const lastUpdateSignatureRef = useRef<string>("");
  const threadsRef = useRef<CommentThread[]>(threads);
  const activeThreadIdRef = useRef<string | null>(activeThreadId);
  const flashThreadIdRef = useRef<string | null>(flashThreadId);
  const onAnchorClickRef = useRef<(threadId: string) => void>(onAnchorClick);

  threadsRef.current = threads;
  activeThreadIdRef.current = activeThreadId;
  flashThreadIdRef.current = flashThreadId;
  onAnchorClickRef.current = onAnchorClick;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    try {
      const markRanges = collectCommentMarkRanges(editor.state.doc);
      const signature = [
        threads.length,
        activeThreadId ?? "",
        flashThreadId ?? "",
        editor.state.doc.content.size,
        markRanges.map((r) => `${r.threadId}:${r.from}:${r.to}`).join("|"),
        threads
          .map(
            (t) =>
              `${t.id}:${t.resolved ? 1 : 0}:${t.anchor?.snippet?.length ?? 0}:${t.anchor?.from ?? ""}:${t.anchor?.to ?? ""}`,
          )
          .join("|"),
      ].join("::");

      if (signature !== lastUpdateSignatureRef.current) {
        lastUpdateSignatureRef.current = signature;
        editor.view.dispatch(editor.state.tr.setMeta(UPDATE_META_KEY, true));
      }
    } catch {
      // ignore if view is tearing down
    }
  }, [editor, threads, activeThreadId, flashThreadId]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const view = editor.view;
    if (!view || !view.dom || !("docView" in view) || !Reflect.get(view, "docView")) return;

    const buildDecorations = () => {
      const decorations: Decoration[] = [];
      const currentThreads = threadsRef.current;
      const currentActive = activeThreadIdRef.current;
      const currentFlash = flashThreadIdRef.current;
      const threadRanges = resolveThreadRanges(editor, currentThreads);

      for (const { threadId, from, to } of threadRanges) {
        if (threadId === currentFlash && threadId !== currentActive) {
          decorations.push(
            Decoration.inline(from, to, { class: "comment-anchor--flash" }),
          );
        }
        if (threadId === currentActive) {
          decorations.push(
            Decoration.inline(from, to, { class: "comment-anchor--active" }),
          );
        }
      }

      return DecorationSet.create(editor.state.doc, decorations);
    };

    const plugin = new Plugin({
      key: PLUGIN_KEY,
      state: {
        init: () => buildDecorations(),
        apply: (tr, old) =>
          tr.docChanged || tr.getMeta(UPDATE_META_KEY) ? buildDecorations() : old,
      },
      props: {
        decorations(state) {
          return PLUGIN_KEY.getState(state) as DecorationSet | undefined;
        },
        handleClick(_view, _pos, event) {
          const target = event.target as HTMLElement | null;
          const anchorEl = target?.closest?.(
            "[data-comment-thread-id]",
          ) as HTMLElement | null;
          const threadId = anchorEl?.getAttribute("data-comment-thread-id");
          if (threadId && !threadId.startsWith("pending-")) {
            onAnchorClickRef.current(threadId);
            return true;
          }
          return false;
        },
      },
    });

    view.updateState(
      view.state.reconfigure({
        plugins: [...view.state.plugins.filter((p) => (p as any).spec?.key !== PLUGIN_KEY), plugin],
      }),
    );

    return () => {
      if (editor.isDestroyed) return;
      const v = editor.view;
      if (!v || !v.dom) return;
      try {
        v.updateState(
          v.state.reconfigure({
            plugins: v.state.plugins.filter((p) => p !== plugin),
          }),
        );
      } catch {
        // view was torn down between checks; safe to ignore
      }
    };
  }, [editor]);
}
