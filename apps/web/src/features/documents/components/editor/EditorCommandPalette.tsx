import { useMemo } from "react";
import type { Editor } from "@tiptap/react";
import { Command } from "cmdk";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { DocumentImageInsertContext } from "@/components/editor/shell/Toolbar/toolbar-utils";
import {
  clearFormatting,
  deleteSelectedMediaNode,
  runTableCommand,
  setSelectedImageAlign,
  setSelectedImageWidth,
} from "@/components/editor/shell/Toolbar/toolbar-utils";

export type EditorCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
  isReadOnly?: boolean;
  imageInsertContext?: DocumentImageInsertContext;
  onInsertTable?: () => void;
  onInsertImage?: () => void;
  onInsertLink?: () => void;
  onOpenFind?: () => void;
  onPrint?: () => void;
  onExportPdf?: () => void;
  onOpenVersionHistory?: () => void;
  onOpenPageSetup?: () => void;
  onToggleFocusMode?: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  onToggleRuler?: () => void;
  onTogglePageBreaks?: () => void;
  onOpenTableProperties?: () => void;
  onInsertTOC?: () => void;
};

type CommandItem = {
  id: string;
  label: string;
  keywords?: string;
  group: string;
  disabled?: boolean;
  run: () => void;
};

export function EditorCommandPalette({
  open,
  onOpenChange,
  editor,
  isReadOnly = false,
  imageInsertContext,
  onInsertTable,
  onInsertImage,
  onInsertLink,
  onOpenFind,
  onPrint,
  onExportPdf,
  onOpenVersionHistory,
  onOpenPageSetup,
  onToggleFocusMode,
  onFitWidth,
  onFitPage,
  onToggleRuler,
  onTogglePageBreaks,
  onOpenTableProperties,
  onInsertTOC,
}: EditorCommandPaletteProps) {
  const chain = () =>
    editor?.chain().focus() as {
      toggleHeading?: (opts: { level: number }) => { run: () => void };
      toggleBulletList?: () => { run: () => void };
      toggleOrderedList?: () => { run: () => void };
      toggleTaskList?: () => { run: () => void };
      insertMermaidBlock?: () => { run: () => void };
      insertMathBlock?: () => { run: () => void };
      insertCallout?: () => { run: () => void };
      insertTOC?: () => { run: () => void };
      insertPageBreak?: () => { run: () => void };
      undo?: () => { run: () => void };
      redo?: () => { run: () => void };
    } | undefined;

  const items = useMemo((): CommandItem[] => {
    const run = (fn: () => void) => {
      onOpenChange(false);
      fn();
    };

    const list: CommandItem[] = [
      {
        id: "find",
        label: "Find in document",
        keywords: "search find text",
        group: "Document",
        run: () => run(() => onOpenFind?.()),
      },
      {
        id: "print",
        label: "Print…",
        keywords: "print preview",
        group: "Document",
        run: () => run(() => onPrint?.()),
      },
      {
        id: "export-pdf",
        label: "Export PDF",
        keywords: "export pdf download",
        group: "Document",
        run: () => run(() => onExportPdf?.()),
      },
      {
        id: "version-history",
        label: "Version history",
        keywords: "versions history",
        group: "Document",
        run: () => run(() => onOpenVersionHistory?.()),
      },
      {
        id: "page-setup",
        label: "Page setup",
        keywords: "margins size paper",
        group: "Document",
        run: () => run(() => onOpenPageSetup?.()),
      },
      {
        id: "focus",
        label: "Toggle focus mode",
        keywords: "focus distraction",
        group: "View",
        run: () => run(() => onToggleFocusMode?.()),
      },
      {
        id: "fit-width",
        label: "Fit width",
        keywords: "zoom fit",
        group: "View",
        run: () => run(() => onFitWidth?.()),
      },
      {
        id: "fit-page",
        label: "Fit page",
        keywords: "zoom fit page",
        group: "View",
        run: () => run(() => onFitPage?.()),
      },
      {
        id: "ruler",
        label: "Toggle ruler",
        keywords: "ruler",
        group: "View",
        run: () => run(() => onToggleRuler?.()),
      },
      {
        id: "page-breaks",
        label: "Toggle page break guides",
        keywords: "pagination guides",
        group: "View",
        run: () => run(() => onTogglePageBreaks?.()),
      },
    ];

    if (!isReadOnly && editor) {
      list.unshift(
        {
          id: "h1",
          label: "Insert Heading 1",
          keywords: "heading h1 title",
          group: "Insert",
          run: () => run(() => chain()?.toggleHeading?.({ level: 1 }).run()),
        },
        {
          id: "h2",
          label: "Insert Heading 2",
          keywords: "heading h2",
          group: "Insert",
          run: () => run(() => chain()?.toggleHeading?.({ level: 2 }).run()),
        },
        {
          id: "h3",
          label: "Insert Heading 3",
          keywords: "heading h3",
          group: "Insert",
          run: () => run(() => chain()?.toggleHeading?.({ level: 3 }).run()),
        },
        {
          id: "bullet",
          label: "Bullet list",
          keywords: "list ul",
          group: "Insert",
          run: () => run(() => chain()?.toggleBulletList?.().run()),
        },
        {
          id: "numbered",
          label: "Numbered list",
          keywords: "list ol ordered",
          group: "Insert",
          run: () => run(() => chain()?.toggleOrderedList?.().run()),
        },
        {
          id: "checklist",
          label: "Checklist",
          keywords: "task todo",
          group: "Insert",
          run: () => run(() => chain()?.toggleTaskList?.().run()),
        },
        {
          id: "link",
          label: "Insert link",
          keywords: "link url anchor",
          group: "Insert",
          run: () => run(() => onInsertLink?.()),
        },
        {
          id: "image",
          label: "Insert image",
          keywords: "image photo upload",
          group: "Insert",
          disabled: !imageInsertContext,
          run: () => run(() => onInsertImage?.()),
        },
        {
          id: "table",
          label: "Insert table",
          keywords: "table grid",
          group: "Insert",
          run: () => run(() => onInsertTable?.()),
        },
        {
          id: "table-properties",
          label: "Table properties",
          keywords: "table border style striped",
          group: "Insert",
          run: () => run(() => onOpenTableProperties?.()),
        },
        {
          id: "table-add-row-above",
          label: "Table: add row above",
          keywords: "table row",
          group: "Insert",
          run: () => run(() => runTableCommand(editor, "addRowBefore")),
        },
        {
          id: "table-add-row-below",
          label: "Table: add row below",
          keywords: "table row",
          group: "Insert",
          run: () => run(() => runTableCommand(editor, "addRowAfter")),
        },
        {
          id: "table-add-col-left",
          label: "Table: add column left",
          keywords: "table column",
          group: "Insert",
          run: () => run(() => runTableCommand(editor, "addColumnBefore")),
        },
        {
          id: "table-add-col-right",
          label: "Table: add column right",
          keywords: "table column",
          group: "Insert",
          run: () => run(() => runTableCommand(editor, "addColumnAfter")),
        },
        {
          id: "table-merge-cells",
          label: "Table: merge cells",
          keywords: "table merge split",
          group: "Insert",
          run: () => run(() => runTableCommand(editor, "mergeCells")),
        },
        {
          id: "table-split-cell",
          label: "Table: split cell",
          keywords: "table merge split",
          group: "Insert",
          run: () => run(() => runTableCommand(editor, "splitCell")),
        },
        {
          id: "table-delete",
          label: "Table: delete table",
          keywords: "table delete remove",
          group: "Insert",
          run: () => run(() => runTableCommand(editor, "deleteTable")),
        },
        {
          id: "image-align-left",
          label: "Image: align left",
          keywords: "image align left",
          group: "Insert",
          run: () => run(() => setSelectedImageAlign(editor, "left")),
        },
        {
          id: "image-align-center",
          label: "Image: align center",
          keywords: "image align center",
          group: "Insert",
          run: () => run(() => setSelectedImageAlign(editor, "center")),
        },
        {
          id: "image-align-right",
          label: "Image: align right",
          keywords: "image align right",
          group: "Insert",
          run: () => run(() => setSelectedImageAlign(editor, "right")),
        },
        {
          id: "image-size-50",
          label: "Image: resize to 50%",
          keywords: "image resize width",
          group: "Insert",
          run: () => run(() => setSelectedImageWidth(editor, 50)),
        },
        {
          id: "image-size-75",
          label: "Image: resize to 75%",
          keywords: "image resize width",
          group: "Insert",
          run: () => run(() => setSelectedImageWidth(editor, 75)),
        },
        {
          id: "image-size-100",
          label: "Image: resize to 100%",
          keywords: "image resize width",
          group: "Insert",
          run: () => run(() => setSelectedImageWidth(editor, 100)),
        },
        {
          id: "delete-media-block",
          label: "Delete selected media block",
          keywords: "delete image diagram equation",
          group: "Insert",
          run: () => run(() => deleteSelectedMediaNode(editor)),
        },
        {
          id: "diagram",
          label: "Insert diagram (Mermaid)",
          keywords: "mermaid diagram flowchart chart",
          group: "Insert",
          run: () => run(() => chain()?.insertMermaidBlock?.().run()),
        },
        {
          id: "equation",
          label: "Insert equation",
          keywords: "math latex katex",
          group: "Insert",
          run: () => run(() => chain()?.insertMathBlock?.().run()),
        },
        {
          id: "callout",
          label: "Insert callout",
          keywords: "callout note info",
          group: "Insert",
          run: () => run(() => chain()?.insertCallout?.().run()),
        },
        {
          id: "toc",
          label: "Insert table of contents",
          keywords: "toc outline index",
          group: "Insert",
          run: () => run(() => (onInsertTOC ? onInsertTOC() : chain()?.insertTOC?.().run())),
        },
        {
          id: "page-break",
          label: "Insert page break",
          keywords: "page break print",
          group: "Insert",
          run: () => run(() => chain()?.insertPageBreak?.().run()),
        },
        {
          id: "undo",
          label: "Undo",
          keywords: "undo",
          group: "Edit",
          run: () => run(() => chain()?.undo?.().run()),
        },
        {
          id: "redo",
          label: "Redo",
          keywords: "redo",
          group: "Edit",
          run: () => run(() => chain()?.redo?.().run()),
        },
        {
          id: "clear-format",
          label: "Clear formatting",
          keywords: "clear format",
          group: "Edit",
          run: () => run(() => {
            if (editor) clearFormatting(editor);
          }),
        },
      );
    }

    return list;
  }, [
    editor,
    isReadOnly,
    imageInsertContext,
    onOpenChange,
    onInsertTable,
    onInsertImage,
    onInsertLink,
    onOpenFind,
    onPrint,
    onExportPdf,
    onOpenVersionHistory,
    onOpenPageSetup,
    onToggleFocusMode,
    onFitWidth,
    onFitPage,
    onToggleRuler,
    onTogglePageBreaks,
    onOpenTableProperties,
    onInsertTOC,
  ]);

  const groups = useMemo(() => {
    const order = ["Insert", "Edit", "View", "Document"];
    const set = new Set(items.map((i) => i.group));
    return order.filter((g) => set.has(g));
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[520px]">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <Command.Input
            placeholder="Search actions…"
            className="h-12 w-full border-0 border-b bg-transparent px-4 text-sm outline-none"
          />
          <Command.List className="max-h-[min(360px,50vh)] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No matching actions.
            </Command.Empty>
            {groups.map((group) => (
              <Command.Group key={group} heading={group}>
                {items
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.keywords ?? ""}`}
                      disabled={item.disabled}
                      onSelect={() => {
                        if (!item.disabled) item.run();
                      }}
                      className="cursor-pointer rounded-md px-2 py-2 text-sm aria-selected:bg-[var(--surface-2)]"
                    >
                      {item.label}
                    </Command.Item>
                  ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
