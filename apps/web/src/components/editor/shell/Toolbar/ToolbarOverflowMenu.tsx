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
  handleInsertImage,
  handleInsertLink,
  handleInsertMermaid,
  deleteSelectedMediaNode,
  pastePlainText,
  runTableCommand,
  setSelectedImageAlign,
  setSelectedImageWidth,
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
};

const ALWAYS_IN_OVERFLOW: ToolbarGroupId[] = ["clipboard", "insert"];

export function ToolbarOverflowMenu({
  hiddenIds,
  ...props
}: ToolbarEditorProps & { hiddenIds: ToolbarGroupId[] }) {
  const { editor, isReadOnly, onInsertTableRequest, onInsertTOCRequest, onOpenTablePropertiesRequest, onInsertLinkRequest, imageInsertContext } = props;

  const chainFocus = () =>
    editor?.chain().focus() as {
      toggleUnderline?: () => { run: () => void };
      insertMathBlock?: () => { run: () => void };
      insertPageBreak?: () => { run: () => void };
      setTextAlign?: (align: string) => { run: () => void };
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
            <MenuItem disabled={isReadOnly} onSelect={() => undefined}>
              Use text & highlight buttons when visible
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
          {groupId === "lists" && (
            <>
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => editor?.chain().focus().toggleBulletList().run()}
              >
                Bullet list
              </MenuItem>
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => editor?.chain().focus().toggleOrderedList().run()}
              >
                Numbered list
              </MenuItem>
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => editor?.chain().focus().toggleTaskList().run()}
              >
                Checklist
              </MenuItem>
            </>
          )}
          {groupId === "quickInsert" && (
            <>
              <MenuItem disabled={isReadOnly} onSelect={() => handleInsertLink(editor, onInsertLinkRequest)}>
                Link
              </MenuItem>
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => handleInsertImage(editor, imageInsertContext)}
              >
                Image
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={onInsertTableRequest}>
                Table
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => onOpenTablePropertiesRequest?.()}>
                Table properties
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => handleInsertMermaid(editor)}>
                Diagram
              </MenuItem>
            </>
          )}
          {groupId === "insert" && (
            <>
              <MenuItem disabled={isReadOnly} onSelect={() => handleInsertLink(editor, onInsertLinkRequest)}>
                Link
              </MenuItem>
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => handleInsertImage(editor, imageInsertContext)}
              >
                Image
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={onInsertTableRequest}>
                Table
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={onInsertTOCRequest}>
                Table of contents
              </MenuItem>
              <MenuSeparator />
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "addRowBefore")}>
                Table: Add row above
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "addRowAfter")}>
                Table: Add row below
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "deleteRow")}>
                Table: Delete row
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "addColumnBefore")}>
                Table: Add column left
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "addColumnAfter")}>
                Table: Add column right
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "deleteColumn")}>
                Table: Delete column
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "mergeCells")}>
                Table: Merge cells
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "splitCell")}>
                Table: Split cell
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "toggleHeaderRow")}>
                Table: Toggle header row
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "toggleHeaderColumn")}>
                Table: Toggle header column
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "toggleHeaderCell")}>
                Table: Toggle header cell
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "setTableCellAlignLeft")}>
                Table: Cell align left
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "setTableCellAlignCenter")}>
                Table: Cell align center
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "setTableCellAlignRight")}>
                Table: Cell align right
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => runTableCommand(editor, "deleteTable")}>
                Table: Delete table
              </MenuItem>
              <MenuSeparator />
              <MenuItem disabled={isReadOnly} onSelect={() => handleInsertMermaid(editor)}>
                Diagram
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => setSelectedImageAlign(editor, "left")}>
                Image: Align left
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => setSelectedImageAlign(editor, "center")}>
                Image: Align center
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => setSelectedImageAlign(editor, "right")}>
                Image: Align right
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => setSelectedImageWidth(editor, 50)}>
                Image: Resize to 50%
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => setSelectedImageWidth(editor, 75)}>
                Image: Resize to 75%
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => setSelectedImageWidth(editor, 100)}>
                Image: Resize to 100%
              </MenuItem>
              <MenuItem
                disabled={isReadOnly}
                onSelect={() => chainFocus()?.insertMathBlock?.().run()}
              >
                Equation
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => deleteSelectedMediaNode(editor)}>
                Delete selected media block
              </MenuItem>
              <MenuItem disabled={isReadOnly} onSelect={() => chainFocus()?.insertPageBreak?.().run()}>
                Page break
              </MenuItem>
            </>
          )}
        </div>
      ))}
    </MenuContent>
  );
}
