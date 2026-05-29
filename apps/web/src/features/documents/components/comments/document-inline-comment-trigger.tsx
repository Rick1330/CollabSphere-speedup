import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import {
  Bold,
  Check,
  Highlighter,
  Italic,
  Link2,
  ListPlus,
  MessageSquarePlus,
  MoreHorizontal,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dispatchEditorCommentCompose } from "@/features/documents/lib/editor-comment-events";
import { EDITOR_PALETTE_COLORS } from "@/features/documents/lib/editor-format-palette";

interface InlineCommentTriggerProps {
  editor: Editor | null;
  /** When false, bubble never shows (e.g. read-only). Component stays mounted. */
  enabled: boolean;
  /** Hide bubble while comment compose or task dialog is open — without unmounting. */
  hideWhilePending?: boolean;
  onCreateTask?: (snippet: string) => void;
  onOpenLinkDialog?: (mode: "external" | "section") => void;
}

type PaletteMode = "text" | "highlight" | null;

const MIN_SELECTION_LENGTH = 2;

function shouldShowBubbleMenu(
  editor: Editor,
  enabled: boolean,
  hideWhilePending: boolean,
): boolean {
  if (!enabled || hideWhilePending || !editor.isEditable) return false;

  const { state } = editor;
  const { empty, from, to } = state.selection;
  if (!(state.selection instanceof TextSelection) || empty || to - from < MIN_SELECTION_LENGTH) {
    return false;
  }

  const text = state.doc.textBetween(from, to, " ").trim();
  if (text.length < MIN_SELECTION_LENGTH) return false;

  const { $from } = state.selection;
  if ($from.parent.type.isAtom) return false;

  const node = $from.node();
  if (node && node.type.isAtom) return false;

  return true;
}

function transformCase(text: string, mode: "upper" | "lower" | "capitalize"): string {
  if (mode === "upper") return text.toUpperCase();
  if (mode === "lower") return text.toLowerCase();
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function BubbleDivider() {
  return <div className="w-px h-5 bg-[#E5E7EB] mx-0.5 shrink-0" aria-hidden="true" />;
}

function BubbleBtn({
  label,
  isActive = false,
  onPress,
  children,
  className,
}: {
  label: string;
  isActive?: boolean;
  onPress: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={isActive}
      onMouseDown={(event) => {
        event.preventDefault();
        onPress();
      }}
      className={cn(
        "selection-bubble-btn h-7 w-7 rounded flex items-center justify-center text-[13px] font-semibold text-[#374151] border-none bg-transparent cursor-pointer transition-colors",
        "hover:bg-[#F3F4F6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500/40",
        isActive && "selection-bubble-btn--active bg-[#CCFBF1] text-[#0F766E]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ColorPaletteRow({
  mode,
  editor,
  onClose,
}: {
  mode: "text" | "highlight";
  editor: Editor;
  onClose: () => void;
}) {
  const currentTextColor =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "#111827";
  const currentHighlight =
    (editor.getAttributes("highlight").color as string | undefined) ?? "#FEF08A";

  return (
    <div className="selection-bubble-palette flex items-center gap-1 px-1 pb-1 pt-0.5 border-t border-[#E5E7EB]">
      {EDITOR_PALETTE_COLORS.map((swatch) => {
        const isSelected =
          mode === "text"
            ? currentTextColor.toLowerCase() === swatch.value.toLowerCase()
            : currentHighlight.toLowerCase() === swatch.value.toLowerCase();
        return (
          <button
            key={swatch.id}
            type="button"
            aria-label={`${mode === "text" ? "Text" : "Highlight"} color ${swatch.label}`}
            onMouseDown={(event) => {
              event.preventDefault();
              if (mode === "text") {
                if (swatch.id === "black") {
                  editor.chain().focus().unsetColor().run();
                } else {
                  editor.chain().focus().setColor(swatch.value).run();
                }
              } else {
                editor.chain().focus().toggleHighlight({ color: swatch.value }).run();
              }
              onClose();
            }}
            className={cn(
              "relative h-6 w-6 rounded-full border border-stone-200 shrink-0",
              isSelected && "ring-2 ring-teal-500 ring-offset-1",
            )}
            style={{ backgroundColor: swatch.value }}
          >
            {isSelected && (
              <Check
                className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow"
                strokeWidth={3}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function BubbleMoreMenu({
  editor,
  onClose,
  onChangeCase,
}: {
  editor: Editor;
  onClose: () => void;
  onChangeCase: (mode: "upper" | "lower" | "capitalize") => void;
}) {
  const itemClass =
    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-stone-700 hover:bg-stone-100";

  return (
    <div
      role="menu"
      aria-label="More formatting options"
      className="absolute right-0 top-full z-[60] mt-1 min-w-[11rem] rounded-md border border-stone-200 bg-white p-1 shadow-lg"
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onMouseDown={(event) => {
          event.preventDefault();
          editor.chain().focus().toggleSubscript().run();
          onClose();
        }}
      >
        <SubscriptIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        Subscript
      </button>
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onMouseDown={(event) => {
          event.preventDefault();
          editor.chain().focus().toggleSuperscript().run();
          onClose();
        }}
      >
        <SuperscriptIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        Superscript
      </button>
      <div className="my-1 h-px bg-stone-200" role="separator" />
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onMouseDown={(event) => {
          event.preventDefault();
          onChangeCase("upper");
          onClose();
        }}
      >
        UPPERCASE
      </button>
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onMouseDown={(event) => {
          event.preventDefault();
          onChangeCase("lower");
          onClose();
        }}
      >
        lowercase
      </button>
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onMouseDown={(event) => {
          event.preventDefault();
          onChangeCase("capitalize");
          onClose();
        }}
      >
        Capitalize
      </button>
      <div className="my-1 h-px bg-stone-200" role="separator" />
      <button
        type="button"
        role="menuitem"
        className={itemClass}
        onMouseDown={(event) => {
          event.preventDefault();
          editor.chain().focus().unsetAllMarks().clearNodes().run();
          onClose();
        }}
      >
        Clear formatting
      </button>
    </div>
  );
}

/**
 * Floating formatting bubble shown above a non-empty text selection.
 * Includes B/I/U/S, color, highlight, link, comment, and task actions.
 */
export const DocumentInlineCommentTrigger = ({
  editor,
  enabled,
  hideWhilePending = false,
  onCreateTask,
  onOpenLinkDialog,
}: InlineCommentTriggerProps) => {
  const [openPalette, setOpenPalette] = useState<PaletteMode>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [, setTick] = useState(0);
  const selectionSnippetRef = useRef("");
  const bubbleRootRef = useRef<HTMLDivElement>(null);

  const bump = useCallback(() => setTick((n) => n + 1), []);

  const resetSubPanels = useCallback(() => {
    setOpenPalette(null);
    setMoreOpen(false);
  }, []);

  useEffect(() => {
    if (!editor) return;

    const onSelectionChange = () => {
      const { from, to, empty } = editor.state.selection;
      if (!empty) {
        selectionSnippetRef.current = editor.state.doc
          .textBetween(from, to, " ")
          .trim()
          .slice(0, 200);
      }

      if (!shouldShowBubbleMenu(editor, enabled, hideWhilePending)) {
        resetSubPanels();
      }
      bump();
    };

    editor.on("selectionUpdate", onSelectionChange);
    editor.on("transaction", onSelectionChange);

    return () => {
      editor.off("selectionUpdate", onSelectionChange);
      editor.off("transaction", onSelectionChange);
    };
  }, [editor, enabled, hideWhilePending, bump, resetSubPanels]);

  useEffect(() => {
    if (!moreOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const root = bubbleRootRef.current;
      if (root && !root.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const handleCommentClick = useCallback(() => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;

    const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
    if (!selectedText) return;

    const pendingId = `pending-${Date.now()}`;
    const quote = selectedText.slice(0, 280);

    editor
      .chain()
      .setMark("commentMark", {
        threadId: pendingId,
        isPending: true,
        resolved: false,
      })
      .run();

    resetSubPanels();

    dispatchEditorCommentCompose({
      pendingId,
      from,
      to,
      quote,
    });
  }, [editor, resetSubPanels]);

  const handleCreateTask = useCallback(() => {
    if (!onCreateTask) return;
    const snippet = selectionSnippetRef.current;
    resetSubPanels();
    queueMicrotask(() => onCreateTask(snippet));
  }, [onCreateTask, resetSubPanels]);

  const openLinkPanel = useCallback(
    (mode: "external" | "section" = "external") => {
      if (!editor) return;
      setOpenPalette(null);
      setMoreOpen(false);
      onOpenLinkDialog?.(mode);
    },
    [editor, onOpenLinkDialog],
  );

  const applyChangeCase = useCallback(
    (mode: "upper" | "lower" | "capitalize") => {
      if (!editor) return;
      const { from, to, empty } = editor.state.selection;
      if (empty) return;
      const text = editor.state.doc.textBetween(from, to, "");
      const transformed = transformCase(text, mode);
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, transformed, { updateSelection: true })
        .run();
    },
    [editor],
  );

  if (!editor) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  const currentTextColor =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "#111827";

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: ed }) =>
        shouldShowBubbleMenu(ed, enabled, hideWhilePending)
      }
      tippyOptions={{
        placement: "top",
        offset: [0, 10],
        maxWidth: "none",
        duration: [150, 100],
      }}
    >
      <div
        ref={bubbleRootRef}
        role="toolbar"
        aria-label="Text formatting"
        className="selection-bubble-menu relative flex flex-col rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
      >
        <div className="flex items-center gap-0.5">
              <BubbleBtn
                label="Bold (Ctrl+B)"
                isActive={isActive("bold")}
                onPress={() => editor.chain().focus().toggleBold().run()}
              >
                B
              </BubbleBtn>
              <BubbleBtn
                label="Italic (Ctrl+I)"
                isActive={isActive("italic")}
                onPress={() => editor.chain().focus().toggleItalic().run()}
              >
                I
              </BubbleBtn>
              <BubbleBtn
                label="Underline (Ctrl+U)"
                isActive={isActive("underline")}
                onPress={() => (editor.chain().focus() as ReturnType<Editor["chain"]>).toggleUnderline().run()}
              >
                <UnderlineIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </BubbleBtn>
              <BubbleBtn
                label="Strikethrough"
                isActive={isActive("strike")}
                onPress={() => editor.chain().focus().toggleStrike().run()}
              >
                <Strikethrough className="h-3.5 w-3.5" aria-hidden="true" />
              </BubbleBtn>

              <BubbleDivider />

              <BubbleBtn
                label="Text color"
                isActive={openPalette === "text"}
                onPress={() => {
                  setMoreOpen(false);
                  setOpenPalette((p) => (p === "text" ? null : "text"));
                }}
                className="w-8"
              >
                <span
                  className="text-[11px] font-bold leading-none"
                  style={{ color: currentTextColor }}
                >
                  A
                </span>
                <span className="text-[8px] leading-none ml-0.5 opacity-60">▼</span>
              </BubbleBtn>
              <BubbleBtn
                label="Highlight color"
                isActive={isActive("highlight") || openPalette === "highlight"}
                onPress={() => {
                  setMoreOpen(false);
                  setOpenPalette((p) => (p === "highlight" ? null : "highlight"));
                }}
              >
                <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
              </BubbleBtn>

              <BubbleDivider />

              <BubbleBtn
                label="Insert link (Ctrl+Shift+K)"
                isActive={isActive("link")}
                onPress={() => openLinkPanel("external")}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
              </BubbleBtn>
              {onOpenLinkDialog ? (
                <BubbleBtn
                  label="Link to section"
                  onPress={() => openLinkPanel("section")}
                  className="w-auto px-1.5 text-[10px] font-medium"
                >
                  §
                </BubbleBtn>
              ) : null}

              <BubbleBtn label="Add comment" onPress={handleCommentClick}>
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
              </BubbleBtn>

              {onCreateTask && (
                <BubbleBtn label="Create task from selection" onPress={handleCreateTask}>
                  <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
                </BubbleBtn>
              )}

              <BubbleDivider />

              <div className="relative">
                <BubbleBtn
                  label="More formatting options"
                  isActive={moreOpen}
                  onPress={() => {
                    setOpenPalette(null);
                    setMoreOpen((open) => !open);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </BubbleBtn>
                {moreOpen && (
                  <BubbleMoreMenu
                    editor={editor}
                    onClose={() => setMoreOpen(false)}
                    onChangeCase={applyChangeCase}
                  />
                )}
              </div>
            </div>

        {openPalette && (
          <ColorPaletteRow
            mode={openPalette}
            editor={editor}
            onClose={() => setOpenPalette(null)}
          />
        )}
      </div>
    </BubbleMenu>
  );
};
