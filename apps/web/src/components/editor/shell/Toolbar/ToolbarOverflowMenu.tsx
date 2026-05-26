import { toast } from "sonner";
import {
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
} from "@/components/ui-kit";
import {
  canRedo,
  canUndo,
  clearFormatting,
  copyEditorSelection,
  cutEditorSelection,
  cycleLineHeight,
  DOC_FONT_FAMILIES,
  getFontSizePt,
  handleIndentDecrease,
  handleIndentIncrease,
  handleInsertLink,
  pastePlainText,
  setFontFamilyChoice,
  setFontSizePt,
  STYLE_ITEMS,
  type ToolbarEditorProps,
  type ToolbarGroupId,
} from "./toolbar-utils";

const GROUP_LABELS: Record<ToolbarGroupId, string> = {
  history: "History",
  clipboard: "Clipboard",
  styles: "Styles",
  font: "Font",
  character: "Character",
  color: "Color",
  quickInsert: "Insert",
  paragraph: "Paragraph",
  lists: "Lists",
  insert: "More insert",
  review: "Review",
};

const ALWAYS_IN_OVERFLOW: ToolbarGroupId[] = ["clipboard", "insert"];

export function ToolbarOverflowMenu({
  hiddenIds,
  ...props
}: ToolbarEditorProps & { hiddenIds: ToolbarGroupId[] }) {
  const { editor, isReadOnly, onInsertTableRequest, onToggleComments } = props;

  const chainFocus = () =>
    editor?.chain().focus() as {
      toggleUnderline?: () => { run: () => void };
      insertMathBlock?: () => { run: () => void };
      insertPageBreak?: () => { run: () => void };
      setTextAlign?: (align: string) => { run: () => void };
      toggleTaskList?: () => { run: () => void };
    } | undefined;

  const runClipboard = (fn: () => Promise<void>) => {
    void fn().catch(() => {
      /* denied without user gesture */
    });
  };

  const menuIds = [...hiddenIds, ...ALWAYS_IN_OVERFLOW.filter((id) => !hiddenIds.includes(id))];

  return (
    <MenuContent align="end" className="cs-editor-toolbar-overflow-menu min-w-[11rem]">
      {menuIds.map((groupId, index) => (
        <div key={groupId}>
          {index > 0 && <MenuSeparator />}
          <MenuLabel>{GROUP_LABELS[groupId]}</MenuLabel>
          {groupId === "history" && (
            <>
              <MenuItem
                disabled={isReadOnly || !canUndo(editor)}
                onSelect={() => editor?.chain().focus().undo().run()}
              >
                Undo
              </MenuItem>
              <MenuItem
                disabled={isReadOnly || !canRedo(editor)}
                onSelect={() => editor?.chain().focus().redo().run()}
              >
                Redo
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => toast.info("Format painter — coming soon")}>
                Format painter
              </MenuItem>
            </>
          )}
          {groupId === "clipboard" && (
            <>
              <MenuItem disabled={isReadOnly} onSelect={() => runClipboard(() => pastePlainText(editor))}>
                Paste
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runClipboard(() => pastePlainText(editor))}>
                Paste without formatting
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runClipboard(() => cutEditorSelection(editor))}>
                Cut
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runClipboard(() => copyEditorSelection(editor))}>
                Copy
              </MenuItem>
            </>
          )}
          {groupId === "styles" && editor && (
            <>
              {STYLE_ITEMS.slice(0, 6).map((item) => (
                <MenuItem key={item.id} disabled={isReadOnly} onSelect={() => item.apply(editor)}>
                  {item.label}
                </MenuItem>
              ))}
              <MenuItem disabled={isReadOnly} onSelect={() => clearFormatting(editor)}>
                Clear formatting
              </MenuItem>
            </>
          )}
          {groupId === "font" && editor && (
            <>
              {DOC_FONT_FAMILIES.map((family) => (
                <MenuItem
                  key={family.id}
                  disabled={isReadOnly}
                  onSelect={() => setFontFamilyChoice(editor, family.value)}
                >
                  {family.label}
                </MenuItem>
              ))}
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => setFontSizePt(editor, getFontSizePt(editor) + 1)}
              >
                Increase font size
              </MenuItem>
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => setFontSizePt(editor, getFontSizePt(editor) - 1)}
              >
                Decrease font size
              </MenuItem>
            </>
          )}
          {groupId === "character" && (
            <>
              <MenuItem disabled={isReadOnly} onSelect={() => editor?.chain().focus().toggleBold().run()}>
                Bold
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => editor?.chain().focus().toggleItalic().run()}>
                Italic
              </MenuItem>
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => chainFocus()?.toggleUnderline?.().run()}
              >
                Underline
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => editor?.chain().focus().toggleStrike().run()}>
                Strikethrough
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => editor?.chain().focus().toggleCode().run()}>
                Inline code
              </MenuItem>
            </>
          )}
          {groupId === "color" && (
            <MenuItem disabled={isReadOnly} onSelect={() => toast.info("Use text/highlight buttons when visible")}>
              Text & highlight color
            </MenuItem>
          )}
          {groupId === "paragraph" && editor && (
            <>
              <MenuItem disabled={isReadOnly} onSelect={() => chainFocus()?.setTextAlign?.("left").run()}>
                Align left
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => chainFocus()?.setTextAlign?.("center").run()}>
                Align center
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => chainFocus()?.setTextAlign?.("right").run()}>
                Align right
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => chainFocus()?.setTextAlign?.("justify").run()}>
                Justify
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => cycleLineHeight(editor)}>
                Line spacing
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => handleIndentIncrease(editor)}>
                Increase indent
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => handleIndentDecrease(editor)}>
                Decrease indent
              </MenuItem>
            </>
          )}
          {groupId === "quickInsert" && (
            <>
              <MenuItem disabled={isReadOnly} onSelect={() => handleInsertLink(editor)}>
                Link
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => onToggleComments?.()}>
                Comment
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => toast.info("Insert image — coming soon")}>
                Image
              </MenuItem>
            </>
          )}
          {groupId === "lists" && (
            <>
              <MenuItem disabled={isReadOnly} onSelect={() => editor?.chain().focus().toggleBulletList().run()}>
                Bullet list
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => editor?.chain().focus().toggleOrderedList().run()}>
                Numbered list
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => chainFocus()?.toggleTaskList?.().run()}>
                Checklist
              </MenuItem>
            </>
          )}
          {groupId === "insert" && (
            <>
              <MenuItem disabled={isReadOnly} onSelect={() => handleInsertLink(editor)}>
                Link
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => toast.info("Insert image — coming soon")}>
                Image
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={onInsertTableRequest}>
                Table
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => toast.info("Insert chart — coming soon")}>
                Chart
              </MenuItem>
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => chainFocus()?.insertMathBlock?.().run()}
              >
                Equation
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => chainFocus()?.insertPageBreak?.().run()}>
                Page break
              </MenuItem>
            </>
          )}
          {groupId === "review" && (
            <>
              <MenuItem onSelect={() => onToggleComments?.()}>Show comments</MenuItem>
              <MenuItem disabled onSelect={() => undefined}>
                Show changes
              </MenuItem>
              <MenuItem disabled onSelect={() => undefined}>
                Spelling
              </MenuItem>
            </>
          )}
        </div>
      ))}
    </MenuContent>
  );
}
