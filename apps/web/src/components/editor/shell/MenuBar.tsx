import { useRef, useState, type ChangeEvent } from "react";
import type { Editor } from "@tiptap/react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  formatDocxServerImportError,
  importDocxFile,
  type ImportWarning,
} from "@/features/documents/lib/docx-import";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuSubmenu,
  MenuTrigger,
  cn,
} from "@/components/ui-kit";
import {
  useEditorStore,
  ZOOM_PRESETS,
  type DocumentPageTheme,
} from "@/features/documents/stores/use-editor-store";
import {
  canRedo,
  canUndo,
  copyEditorSelection,
  cutEditorSelection,
  pastePlainText,
} from "./Toolbar/toolbar-utils";

export type MenuBarProps = {
  editor?: Editor | null;
  documentTitle?: string;
  workspaceId?: string;
  documentId?: string;
  readOnly?: boolean;
  onToggleTree?: () => void;
  onToggleComments?: () => void;
  onToggleFocusMode?: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  onOpenVersionHistory?: () => void;
  onOpenPageSetup?: () => void;
  onServerDocxImported?: () => void;
  onDocxImportStart?: () => void;
  onDocxImportStateChange?: (state: {
    importing: boolean;
    progress: number | null;
  }) => void;
  isCollabActive?: boolean;
  className?: string;
};

const MENU_TRIGGER_CLASS =
  "h-full px-2.5 text-[length:var(--text-sm-size)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] rounded-none";

function FileMenu({
  editor,
  documentTitle,
  workspaceId,
  documentId,
  readOnly,
  onToggleTree,
  onOpenVersionHistory,
  onOpenPageSetup,
  onServerDocxImported,
  onDocxImportStart,
  onDocxImportStateChange,
  isCollabActive,
}: Pick<
  MenuBarProps,
  | "onToggleTree"
  | "onOpenVersionHistory"
  | "onOpenPageSetup"
  | "readOnly"
  | "workspaceId"
  | "documentId"
  | "onServerDocxImported"
  | "onDocxImportStart"
  | "onDocxImportStateChange"
  | "isCollabActive"
> & {
  editor?: Editor | null;
  documentTitle?: string;
}) {
  const disabled = !editor;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importAbortRef = useRef<AbortController | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importWarnings, setImportWarnings] = useState<ImportWarning[] | null>(null);
  const setPageSetup = useEditorStore((s) => s.setPageSetup);
  const setDocumentTypographyProfile = useEditorStore(
    (s) => s.setDocumentTypographyProfile,
  );

  const downloadMarkdown = () => {
    if (!editor) return;
    const content = editor.getText();
    const safeTitle = (documentTitle ?? "document").trim() || "document";
    const fileName = `${safeTitle}.md`;

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    globalThis.URL.revokeObjectURL(url);
    toast.success("Markdown exported");
  };

  const handleImportDocx = () => {
    if (readOnly) {
      toast.error("Cannot import — document is read-only");
      return;
    }
    if (importing) return;
    fileInputRef.current?.click();
  };

  const onDocxSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;

    if (
      !window.confirm(
        "Import DOCX will replace the entire document body. Continue?",
      )
    ) {
      return;
    }

    importAbortRef.current?.abort();
    const controller = new AbortController();
    importAbortRef.current = controller;
    setImporting(true);
    setImportProgress(0);
    onDocxImportStateChange?.({ importing: true, progress: 0 });
    onDocxImportStart?.();

    try {
      const result = await importDocxFile(file, {
        workspaceId,
        documentId,
        signal: controller.signal,
        onProgress: (progress) => {
          setImportProgress(progress);
          onDocxImportStateChange?.({ importing: true, progress });
        },
      });
      setPageSetup(result.pageSetup);
      setDocumentTypographyProfile("word-import");
      if (result.mode === "server" && onServerDocxImported) {
        onServerDocxImported();
      } else if (result.mode === "client" && isCollabActive) {
        throw new Error(
          "Client import cannot run while collaboration is active. Use server import or disconnect first.",
        );
      } else {
        editor.commands.setContent(result.content);
      }
      if (result.warnings.length > 0) {
        setImportWarnings(result.warnings);
        toast.warning(`Imported with ${result.warnings.length} warning(s)`, {
          description: result.warnings
            .slice(0, 2)
            .map((w) => w.message)
            .join("; "),
          action: {
            label: "View all",
            onClick: () => setImportWarnings(result.warnings),
          },
        });
      } else {
        toast.success("DOCX imported");
      }
    } catch (error) {
      if (controller.signal.aborted) {
        toast.info("DOCX import cancelled");
      } else {
        console.error("[docx-import]", error);
        const detail =
          error instanceof Error
            ? formatDocxServerImportError(error.message)
            : "DOCX import failed";
        toast.error(detail);
      }
    } finally {
      setImporting(false);
      setImportProgress(null);
      onDocxImportStateChange?.({ importing: false, progress: null });
      importAbortRef.current = null;
    }
  };

  return (
    <>
    <Menu>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => void onDocxSelected(e)}
      />
      <MenuTrigger className={MENU_TRIGGER_CLASS}>File</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => toast.info("New document — use Documents page")}>
          New
          <MenuShortcut>Ctrl+N</MenuShortcut>
        </MenuItem>
        <MenuItem onSelect={() => toast.info("Duplicate — coming soon")}>Duplicate</MenuItem>
        <MenuSeparator />
        <MenuItem disabled={disabled || readOnly || importing} onSelect={handleImportDocx}>
          {importing
            ? importProgress != null
              ? `Importing DOCX… ${Math.round(importProgress)}%`
              : "Importing DOCX…"
            : "Import DOCX…"}
        </MenuItem>
        <MenuItem onSelect={() => onOpenPageSetup?.()}>Page setup…</MenuItem>
        <MenuSeparator />
        <MenuItem disabled={disabled} onSelect={() => window.print()}>
          Export PDF
        </MenuItem>
        <MenuItem disabled={disabled} onSelect={downloadMarkdown}>
          Export Markdown
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => onOpenVersionHistory?.()}>
          Version history
          <MenuShortcut>Ctrl+Alt+H</MenuShortcut>
        </MenuItem>
        <MenuItem onSelect={() => onToggleTree?.()}>Toggle document tree</MenuItem>
      </MenuContent>
    </Menu>
    <Dialog open={importWarnings != null} onOpenChange={(open) => !open && setImportWarnings(null)}>
      <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import warnings</DialogTitle>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
          {importWarnings?.map((w, i) => (
            <li key={`${w.type}-${i}`}>
              <span className="font-medium text-foreground">{w.type}:</span> {w.message}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
    </>
  );
}

function EditMenu({ editor }: { editor: Editor | null | undefined }) {
  const runClipboard = (fn: () => Promise<void>) => {
    void fn().catch(() => toast.info("Clipboard access denied"));
  };

  return (
    <Menu>
      <MenuTrigger className={MENU_TRIGGER_CLASS}>Edit</MenuTrigger>
      <MenuContent>
        <MenuItem
          disabled={!editor || !canUndo(editor)}
          onSelect={() => editor?.chain().focus().undo().run()}
        >
          Undo
          <MenuShortcut>Ctrl+Z</MenuShortcut>
        </MenuItem>
        <MenuItem
          disabled={!editor || !canRedo(editor)}
          onSelect={() => editor?.chain().focus().redo().run()}
        >
          Redo
          <MenuShortcut>Ctrl+Y</MenuShortcut>
        </MenuItem>
        <MenuSeparator />
        <MenuItem disabled={!editor} onSelect={() => runClipboard(() => cutEditorSelection(editor!))}>
          Cut
          <MenuShortcut>Ctrl+X</MenuShortcut>
        </MenuItem>
        <MenuItem disabled={!editor} onSelect={() => runClipboard(() => copyEditorSelection(editor!))}>
          Copy
          <MenuShortcut>Ctrl+C</MenuShortcut>
        </MenuItem>
        <MenuItem disabled={!editor} onSelect={() => runClipboard(() => pastePlainText(editor!))}>
          Paste
          <MenuShortcut>Ctrl+V</MenuShortcut>
        </MenuItem>
        <MenuItem disabled={!editor} onSelect={() => runClipboard(() => pastePlainText(editor!))}>
          Paste without formatting
          <MenuShortcut>Ctrl+Shift+V</MenuShortcut>
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => toast.info("Find & replace — coming soon")}>
          Find
          <MenuShortcut>Ctrl+F</MenuShortcut>
        </MenuItem>
        <MenuItem onSelect={() => toast.info("Find & replace — coming soon")}>
          Replace
          <MenuShortcut>Ctrl+H</MenuShortcut>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function ViewMenu({
  onToggleTree,
  onToggleComments,
  onToggleFocusMode,
  onFitWidth,
  onFitPage,
}: Pick<
  MenuBarProps,
  "onToggleTree" | "onToggleComments" | "onToggleFocusMode" | "onFitWidth" | "onFitPage"
>) {
  const showRuler = useEditorStore((s) => s.showRuler);
  const toggleRuler = useEditorStore((s) => s.toggleRuler);
  const showPageBreaks = useEditorStore((s) => s.showPageBreaks);
  const toggleShowPageBreaks = useEditorStore((s) => s.toggleShowPageBreaks);
  const setZoomLevel = useEditorStore((s) => s.setZoomLevel);
  const documentPageTheme = useEditorStore((s) => s.documentPageTheme);
  const setDocumentPageTheme = useEditorStore((s) => s.setDocumentPageTheme);

  const setPageTheme = (theme: DocumentPageTheme) => setDocumentPageTheme(theme);

  return (
    <Menu>
      <MenuTrigger className={MENU_TRIGGER_CLASS}>View</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => onToggleTree?.()}>Document tree</MenuItem>
        <MenuItem onSelect={() => onToggleComments?.()}>Comments panel</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => toggleRuler()}>
          {showRuler ? "Hide ruler" : "Show ruler"}
        </MenuItem>
        <MenuItem onSelect={() => toggleShowPageBreaks()}>
          {showPageBreaks ? "Hide page break guides" : "Show page break guides"}
        </MenuItem>
        <MenuSeparator />
        <MenuSubmenu label="Page appearance">
          <MenuItem
            onSelect={() => setPageTheme("light")}
            className={documentPageTheme === "light" ? "bg-[var(--brand-50)]" : undefined}
          >
            Light page
          </MenuItem>
          <MenuItem
            onSelect={() => setPageTheme("dark")}
            className={documentPageTheme === "dark" ? "bg-[var(--brand-50)]" : undefined}
          >
            Dark page
          </MenuItem>
        </MenuSubmenu>
        <MenuSeparator />
        <MenuItem onSelect={() => onToggleFocusMode?.()}>
          Focus mode
          <MenuShortcut>⌘.</MenuShortcut>
        </MenuItem>
        <MenuSubmenu label="Zoom">
          {onFitWidth ? <MenuItem onSelect={() => onFitWidth()}>Fit width</MenuItem> : null}
          {onFitPage ? <MenuItem onSelect={() => onFitPage()}>Fit page</MenuItem> : null}
          {(onFitWidth || onFitPage) && <MenuSeparator />}
          {ZOOM_PRESETS.map((preset) => (
            <MenuItem key={preset} onSelect={() => setZoomLevel(preset)}>
              {preset}%
            </MenuItem>
          ))}
        </MenuSubmenu>
      </MenuContent>
    </Menu>
  );
}

function InsertMenu() {
  return (
    <Menu>
      <MenuTrigger className={MENU_TRIGGER_CLASS}>Insert</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => toast.info("Use toolbar or / slash menu")}>Table</MenuItem>
        <MenuItem onSelect={() => toast.info("Use toolbar")}>Image</MenuItem>
        <MenuItem onSelect={() => toast.info("Use toolbar")}>Link</MenuItem>
      </MenuContent>
    </Menu>
  );
}

function FormatMenu() {
  return (
    <Menu>
      <MenuTrigger className={MENU_TRIGGER_CLASS}>Format</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => toast.info("Use toolbar formatting")}>Bold</MenuItem>
        <MenuItem onSelect={() => toast.info("Use toolbar formatting")}>Italic</MenuItem>
        <MenuItem onSelect={() => toast.info("Use toolbar formatting")}>Clear formatting</MenuItem>
      </MenuContent>
    </Menu>
  );
}

function ToolsMenu() {
  return (
    <Menu>
      <MenuTrigger className={MENU_TRIGGER_CLASS}>Tools</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => toast.info("Word count — see status bar")}>Word count</MenuItem>
        <MenuItem onSelect={() => toast.info("Spell check — coming soon")}>Spelling</MenuItem>
      </MenuContent>
    </Menu>
  );
}

function ReviewMenu({ onOpenVersionHistory }: Pick<MenuBarProps, "onOpenVersionHistory">) {
  return (
    <Menu>
      <MenuTrigger className={MENU_TRIGGER_CLASS}>Review</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => toast.info("Track changes — coming in a later phase")}>
          Track changes
        </MenuItem>
        <MenuItem onSelect={() => onOpenVersionHistory?.()}>Version history</MenuItem>
      </MenuContent>
    </Menu>
  );
}

function HelpMenu() {
  return (
    <Menu>
      <MenuTrigger className={MENU_TRIGGER_CLASS}>Help</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => toast.info("Keyboard shortcuts — coming soon")}>
          Keyboard shortcuts
        </MenuItem>
        <MenuItem onSelect={() => toast.info("CollabSphere documentation — coming soon")}>
          Documentation
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function MenuBar({
  editor,
  documentTitle,
  workspaceId,
  documentId,
  readOnly,
  onToggleTree,
  onToggleComments,
  onToggleFocusMode,
  onFitWidth,
  onFitPage,
  onOpenVersionHistory,
  onOpenPageSetup,
  onServerDocxImported,
  onDocxImportStart,
  onDocxImportStateChange,
  isCollabActive,
  className,
}: MenuBarProps) {
  return (
    <nav
      aria-label="Editor menu"
      className={cn("flex h-full w-full min-w-0 items-stretch gap-0", className)}
    >
      <div className="flex min-w-0 items-stretch overflow-x-auto">
        <FileMenu
          editor={editor}
          documentTitle={documentTitle}
          workspaceId={workspaceId}
          documentId={documentId}
          readOnly={readOnly}
          onToggleTree={onToggleTree}
          onOpenVersionHistory={onOpenVersionHistory}
          onOpenPageSetup={onOpenPageSetup}
          onServerDocxImported={onServerDocxImported}
          onDocxImportStart={onDocxImportStart}
          onDocxImportStateChange={onDocxImportStateChange}
          isCollabActive={isCollabActive}
        />
        <EditMenu editor={editor} />
        <ViewMenu
          onToggleTree={onToggleTree}
          onToggleComments={onToggleComments}
          onToggleFocusMode={onToggleFocusMode}
          onFitWidth={onFitWidth}
          onFitPage={onFitPage}
        />
        <InsertMenu />
        <FormatMenu />
        <ToolsMenu />
        <ReviewMenu onOpenVersionHistory={onOpenVersionHistory} />
        <HelpMenu />
      </div>
      <div className="ml-auto flex shrink-0 items-center pr-2">
        <button
          type="button"
          className={cn(
            MENU_TRIGGER_CLASS,
            "inline-flex items-center gap-1.5 rounded-sm px-2",
          )}
          onClick={() => toast.info("Command palette — coming soon (Ctrl+K)")}
        >
          <Search size={14} strokeWidth={1.75} aria-hidden />
          <span className="hidden sm:inline">Search actions</span>
          <MenuShortcut className="hidden md:inline">Ctrl+K</MenuShortcut>
        </button>
      </div>
    </nav>
  );
}
