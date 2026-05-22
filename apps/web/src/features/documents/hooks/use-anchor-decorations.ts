import { useEffect, useRef } from "react";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import type { CommentThread } from "@/lib/mock-comments";

const PLUGIN_KEY = new PluginKey("doc-anchors");
const UPDATE_META_KEY = "doc-anchors:update";

interface UseAnchorDecorationsArgs {
  editor: Editor | null;
  threads: CommentThread[];
  activeThreadId: string | null;
  flashThreadId: string | null;
  onAnchorClick: (threadId: string) => void;
}

/**
 * Decorate text ranges in the editor that match each thread's `anchor.snippet`.
 * The first occurrence wins per thread; if no match is found we mark the thread
 * anchor as "changed" via a side-effect callback (handled at thread-creation
 * time in the seed data — this hook keeps decorations purely visual).
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
    // Trigger decoration rebuild without reconfiguring plugins.
    // This keeps plugin installation stable and avoids React update loops.
    try {
      const signature = [
        threads.length,
        activeThreadId ?? "",
        flashThreadId ?? "",
        threads.map((t) => `${t.id}:${t.resolved ? 1 : 0}:${t.anchor?.snippet?.length ?? 0}`).join("|"),
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
    // ProseMirror's updateState reads view.docView which is null when the
    // editor DOM has been detached. Bail out if the view isn't fully alive.
    if (!view || !view.dom || !("docView" in view) || !Reflect.get(view, "docView")) return;

    const buildDecorations = () => {
      const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n", " ");
      const decorations: Decoration[] = [];
      const usedRanges: Array<[number, number]> = [];

      const currentThreads = threadsRef.current;
      const currentActive = activeThreadIdRef.current;
      const currentFlash = flashThreadIdRef.current;

      currentThreads.forEach((t) => {
        if (!t.anchor || t.resolved) return;
        const snippet = t.anchor.snippet;
        if (!snippet) return;

        // Find first non-overlapping occurrence
        let searchFrom = 0;
        while (searchFrom < docText.length) {
          const idx = docText.indexOf(snippet, searchFrom);
          if (idx === -1) break;
          const conflict = usedRanges.some(([s, e]) => idx < e && idx + snippet.length > s);
          if (!conflict) {
            // Map plain-text index to ProseMirror positions: walk doc to find
            let pmFrom = -1;
            let pmTo = -1;
            let plain = 0;
            editor.state.doc.descendants((node, pos) => {
              if (pmTo !== -1) return false;
              if (node.isText) {
                const len = node.text?.length ?? 0;
                if (pmFrom === -1 && plain + len > idx) {
                  pmFrom = pos + (idx - plain);
                }
                if (pmFrom !== -1 && plain + len >= idx + snippet.length) {
                  pmTo = pos + (idx + snippet.length - plain);
                  return false;
                }
                plain += len;
              } else if (node.isBlock && plain > 0) {
                // block boundary contributes one separator char in textBetween
                plain += 1;
              }
              return true;
            });

            if (pmFrom !== -1 && pmTo !== -1) {
              const classes = ["doc-anchor"];
              if (t.id === currentActive) classes.push("is-active");
              if (t.id === currentFlash) classes.push("is-flashing");
              decorations.push(
                Decoration.inline(pmFrom, pmTo, {
                  class: classes.join(" "),
                  "data-thread-id": t.id,
                }),
              );
              decorations.push(
                Decoration.widget(
                  pmTo,
                  () => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "doc-anchor-trigger";
                    button.setAttribute("aria-label", "Open comment thread");
                    button.setAttribute("title", "Open comment thread");
                    button.setAttribute("data-thread-id", t.id);
                    button.innerHTML = `
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M7.5 4.5h9A3.5 3.5 0 0 1 20 8v4a3.5 3.5 0 0 1-3.5 3.5H13l-3.5 3v-3H7.5A3.5 3.5 0 0 1 4 12V8a3.5 3.5 0 0 1 3.5-3.5Z" fill="currentColor" opacity="0.14"/>
                        <path d="M8.25 8.25h7.5M8.25 11.25h5.4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/>
                      </svg>
                    `;
                    button.addEventListener("mousedown", (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onAnchorClickRef.current(t.id);
                    });
                    return button;
                  },
                  { side: 1 },
                ),
              );
              usedRanges.push([idx, idx + snippet.length]);
            }
            break;
          }
          searchFrom = idx + 1;
        }
      });

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
        handleClick(view, _pos, event) {
          const target = event.target as HTMLElement | null;
          const anchorEl = target?.closest?.("[data-thread-id]") as HTMLElement | null;
          const threadId = anchorEl?.getAttribute("data-thread-id");
          if (threadId) {
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
      // Guard: editor or view may have been destroyed before cleanup runs
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
