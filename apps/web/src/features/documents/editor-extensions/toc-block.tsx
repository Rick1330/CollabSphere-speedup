import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { ListTree, RefreshCw, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  collectDocumentHeadings,
  scrollToHeadingPos,
  type DocumentHeading,
} from "@/features/documents/lib/document-headings";
import {
  buildTocEntries,
  DEFAULT_TOC_OPTIONS,
  resolveBlockInsertPos,
  waitForPaginationIdle,
  type TocEntry,
  type TocStyle,
} from "@/features/documents/lib/document-toc";
import {
  buildHeadingSnapshot,
  type HeadingSnapshot,
} from "@/features/documents/lib/document-toc-sync";
import { BlockCanvasToolbar, deleteNodeAtPos } from "@/features/documents/components/editor/block-canvas-toolbar";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";

type TocAttrs = {
  includedLevels: number[];
  style: TocStyle;
  showPageNumbers: boolean;
  clickableLinks: boolean;
};

function parseIncludedLevels(value: unknown): number[] {
  if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
    return value as number[];
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((n) => typeof n === "number");
    } catch {
      // ignore
    }
  }
  return [...DEFAULT_TOC_OPTIONS.includedLevels];
}

const TOCView = ({ node, editor, updateAttributes, getPos }: NodeViewProps) => {
  const attrs: TocAttrs = {
    includedLevels: parseIncludedLevels(node.attrs.includedLevels),
    style: (node.attrs.style as TocStyle) ?? DEFAULT_TOC_OPTIONS.style,
    showPageNumbers: node.attrs.showPageNumbers !== false,
    clickableLinks: node.attrs.clickableLinks !== false,
  };

  const [items, setItems] = useState<TocEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const syncGenRef = useRef(0);
  const regenerateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotRef = useRef<HeadingSnapshot>("");

  const pageSetup = useEditorStore((s) => s.pageSetup);

  const applyEntries = useCallback(
    (entries: TocEntry[]) => {
      setItems(entries);
    },
    [],
  );

  const regenerate = useCallback(
    async (options?: { showSyncing?: boolean }) => {
      const gen = ++syncGenRef.current;
      if (options?.showSyncing) {
        setIsSyncing(true);
      }
      await waitForPaginationIdle();
      if (gen !== syncGenRef.current) return;

      const snapshot = buildHeadingSnapshot(editor);
      if (snapshot === lastSnapshotRef.current && !options?.showSyncing) {
        if (options?.showSyncing) setIsSyncing(false);
        return;
      }
      lastSnapshotRef.current = snapshot;

      const headings = collectDocumentHeadings(editor);
      const entries = buildTocEntries(headings, {
        includedLevels: attrs.includedLevels,
        style: attrs.style,
        showPageNumbers: attrs.showPageNumbers,
        editor,
        pageSetup,
      });
      applyEntries(entries);
      setIsSyncing(false);
    },
    [editor, attrs.includedLevels, attrs.style, attrs.showPageNumbers, pageSetup, applyEntries],
  );

  const scheduleRegenerate = useCallback(() => {
    if (regenerateTimerRef.current) {
      clearTimeout(regenerateTimerRef.current);
    }
    regenerateTimerRef.current = setTimeout(() => {
      regenerateTimerRef.current = null;
      void regenerate();
    }, 350);
  }, [regenerate]);

  const scheduleResizeRegenerate = useCallback(() => {
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }
    resizeTimerRef.current = setTimeout(() => {
      resizeTimerRef.current = null;
      void regenerate();
    }, 400);
  }, [regenerate]);

  useEffect(() => {
    void regenerate({ showSyncing: true });

    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (!transaction.docChanged) return;
      scheduleRegenerate();
    };

    editor.on("transaction", onTransaction);

    const canvas = editor.view.dom.closest(".cs-paginated-canvas-outer");
    let observer: ResizeObserver | null = null;
    if (canvas) {
      observer = new ResizeObserver(() => {
        scheduleResizeRegenerate();
      });
      observer.observe(canvas);
    }

    return () => {
      editor.off("transaction", onTransaction);
      observer?.disconnect();
      if (regenerateTimerRef.current) {
        clearTimeout(regenerateTimerRef.current);
        regenerateTimerRef.current = null;
      }
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [editor, regenerate, scheduleRegenerate, scheduleResizeRegenerate]);

  const jumpToHeading = (heading: DocumentHeading) => {
    if (!attrs.clickableLinks) return;
    const textPos = Math.min(editor.state.doc.content.size, heading.pos + 1);
    editor.chain().focus().setTextSelection(textPos).run();
    scrollToHeadingPos(editor, heading.pos);
  };

  const toggleLevel = (level: number) => {
    const next = attrs.includedLevels.includes(level)
      ? attrs.includedLevels.filter((l) => l !== level)
      : [...attrs.includedLevels, level].sort((a, b) => a - b);
    updateAttributes({ includedLevels: next });
  };

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper
      className="my-8 toc-block relative group min-h-[8rem]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isEditable && (
        <BlockCanvasToolbar
          editor={editor}
          visible={isHovered}
          onDelete={() => deleteNodeAtPos(editor, getPos)}
        >
          <button
            type="button"
            aria-label="Refresh TOC"
            title="Refresh"
            className="p-1.5 rounded-md hover:bg-stone-50 text-stone-500"
            onClick={() => void regenerate({ showSyncing: true })}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
          </button>
          <button
            type="button"
            aria-label="TOC settings"
            title="Settings"
            className="p-1.5 rounded-md hover:bg-stone-50 text-stone-500"
            onClick={() => setShowSettings((s) => !s)}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </BlockCanvasToolbar>
      )}

      <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-6 min-h-[6rem]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-stone-900 font-semibold">
            <ListTree className="h-4 w-4 text-teal-600" />
            <h4 className="text-sm">Table of Contents</h4>
            {isSyncing ? (
              <span className="text-[11px] font-normal text-stone-400">Updating…</span>
            ) : null}
          </div>
        </div>

        {showSettings && isEditable && (
          <div className="mb-4 rounded-lg border border-stone-200 bg-white p-3 text-xs space-y-2">
            <p className="font-medium text-stone-700">Include headings</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={cn(
                    "px-2 py-1 rounded border",
                    attrs.includedLevels.includes(level)
                      ? "border-teal-400 bg-teal-50 text-teal-800"
                      : "border-stone-200 text-stone-600",
                  )}
                  onClick={() => toggleLevel(level)}
                >
                  H{level}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              {(["indented", "numbered", "flat"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    "px-2 py-1 rounded border capitalize",
                    attrs.style === s
                      ? "border-teal-400 bg-teal-50 text-teal-800"
                      : "border-stone-200 text-stone-600",
                  )}
                  onClick={() => updateAttributes({ style: s })}
                >
                  {s}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={attrs.showPageNumbers}
                onChange={(e) => updateAttributes({ showPageNumbers: e.target.checked })}
              />
              Show page numbers
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={attrs.clickableLinks}
                onChange={(e) => updateAttributes({ clickableLinks: e.target.checked })}
              />
              Clickable links
            </label>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-[13px] text-stone-400 italic">
            Add headings (Title or Heading 1–3) to see them here. Use the settings
            gear to include Heading 4–6.
          </p>
        ) : (
          <nav className="space-y-1">
            {items.map((item) => {
              const indent =
                attrs.style === "flat"
                  ? 0
                  : attrs.style === "numbered"
                    ? 0
                    : (item.level - 1) * 16;

              const row = (
                <>
                  <span className="truncate">{item.label}</span>
                  {attrs.showPageNumbers && item.pageNumber != null ? (
                    <span className="flex-1 border-b border-dotted border-stone-300 mx-2 min-w-[1rem] opacity-60" />
                  ) : null}
                  {attrs.showPageNumbers && item.pageNumber != null ? (
                    <span className="tabular-nums text-stone-500 shrink-0">{item.pageNumber}</span>
                  ) : null}
                </>
              );

              if (attrs.clickableLinks) {
                return (
                  <button
                    key={`${item.pos}-${item.anchorId}`}
                    type="button"
                    onClick={() => jumpToHeading(item)}
                    className={cn(
                      "w-full flex items-baseline text-left text-[13px] text-stone-600 hover:text-teal-600 rounded px-1 py-0.5 hover:bg-stone-100/80",
                      item.level === 1 && attrs.style !== "flat" && "font-medium",
                    )}
                    style={{ paddingLeft: `${indent + 4}px` }}
                  >
                    {row}
                  </button>
                );
              }

              return (
                <div
                  key={`${item.pos}-${item.anchorId}`}
                  className={cn(
                    "w-full flex items-baseline text-[13px] text-stone-600 px-1 py-0.5",
                    item.level === 1 && attrs.style !== "flat" && "font-medium",
                  )}
                  style={{ paddingLeft: `${indent + 4}px` }}
                >
                  {row}
                </div>
              );
            })}
          </nav>
        )}
      </div>
    </NodeViewWrapper>
  );
};

type InsertTOCOptions = Partial<TocAttrs> & { at?: number };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tocBlock: {
      insertTOC: (options?: InsertTOCOptions) => ReturnType;
    };
  }
}

export const TOCBlock = Node.create({
  name: "tocBlock",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      includedLevels: {
        default: DEFAULT_TOC_OPTIONS.includedLevels,
        parseHTML: (el) => parseIncludedLevels(el.getAttribute("data-included-levels")),
        renderHTML: (attrs) => ({
          "data-included-levels": JSON.stringify(attrs.includedLevels ?? DEFAULT_TOC_OPTIONS.includedLevels),
        }),
      },
      style: {
        default: DEFAULT_TOC_OPTIONS.style,
        parseHTML: (el) => (el.getAttribute("data-toc-style") as TocStyle) ?? DEFAULT_TOC_OPTIONS.style,
        renderHTML: (attrs) => ({ "data-toc-style": attrs.style }),
      },
      showPageNumbers: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-show-page-numbers") !== "false",
        renderHTML: (attrs) =>
          attrs.showPageNumbers === false ? { "data-show-page-numbers": "false" } : {},
      },
      clickableLinks: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-clickable-links") !== "false",
        renderHTML: (attrs) =>
          attrs.clickableLinks === false ? { "data-clickable-links": "false" } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toc-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "toc-block" }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TOCView);
  },

  addCommands() {
    return {
      insertTOC:
        (options) =>
        ({ commands, state }) => {
          const { at, ...attrs } = options ?? {};
          const content = {
            type: this.name,
            attrs: { ...DEFAULT_TOC_OPTIONS, ...attrs },
          };
          if (typeof at === "number") {
            const insertPos = resolveBlockInsertPos(state, at);
            return commands.insertContentAt(insertPos, content, { updateSelection: true });
          }
          return commands.insertContent(content);
        },
    };
  },
});
