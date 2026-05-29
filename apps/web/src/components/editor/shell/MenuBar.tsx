import type { Editor } from "@tiptap/react";
import { Search } from "lucide-react";
import { toast } from "sonner";
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
  readOnly?: boolean;
  onToggleTree?: () => void;
  onToggleComments?: () => void;
  onToggleFocusMode?: () => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
  onOpenVersionHistory?: () => void;
  onOpenPageSetup?: () => void;
  onOpenCommandPalette?: () => void;
  onPrint?: () => void;
  onExportPdf?: () => void;
  className?: string;
};

const MENU_TRIGGER_CLASS =
  "h-full px-2.5 text-[length:var(--text-sm-size)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] rounded-none";

function FileMenu({
  editor,
  readOnly,
  onToggleTree,
  onOpenVersionHistory,
  onOpenPageSetup,
  onPrint,
  onExportPdf,
}: Pick<
  MenuBarProps,
  "onToggleTree" | "onOpenVersionHistory" | "onOpenPageSetup" | "onPrint" | "onExportPdf" | "readOnly"
> & {
  editor?: Editor | null;
}) {
  const disabled = !editor;

  return (
    <Menu>
      <MenuTrigger className={MENU_TRIGGER_CLASS}>File</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => toast.info("New document — use Documents page")}>
          New
          <MenuShortcut>Ctrl+N</MenuShortcut>
        </MenuItem>
        <MenuItem onSelect={() => toast.info("Duplicate — coming soon")}>Duplicate</MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => onOpenPageSetup?.()}>Page setup…</MenuItem>
        <MenuSeparator />
        <MenuItem disabled={disabled} onSelect={() => onPrint?.()}>
          Print…
        </MenuItem>
        <MenuItem disabled={disabled} onSelect={() => onExportPdf?.()}>
          Export PDF
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => onOpenVersionHistory?.()}>
          Version history
          <MenuShortcut>Ctrl+Alt+H</MenuShortcut>
        </MenuItem>
        <MenuItem onSelect={() => onToggleTree?.()}>Toggle document tree</MenuItem>
      </MenuContent>
    </Menu>
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

function ToolsMenu() {
  return (
    <Menu>
      <MenuTrigger className={MENU_TRIGGER_CLASS}>Tools</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => toast.info("Word count — see status bar")}>Word count</MenuItem>
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
  readOnly,
  onToggleTree,
  onToggleComments,
  onToggleFocusMode,
  onFitWidth,
  onFitPage,
  onOpenVersionHistory,
  onOpenPageSetup,
  onOpenCommandPalette,
  onPrint,
  onExportPdf,
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
          readOnly={readOnly}
          onToggleTree={onToggleTree}
          onOpenVersionHistory={onOpenVersionHistory}
          onOpenPageSetup={onOpenPageSetup}
          onPrint={onPrint}
          onExportPdf={onExportPdf}
        />
        <EditMenu editor={editor} />
        <ViewMenu
          onToggleTree={onToggleTree}
          onToggleComments={onToggleComments}
          onToggleFocusMode={onToggleFocusMode}
          onFitWidth={onFitWidth}
          onFitPage={onFitPage}
        />
        <ToolsMenu />
        <HelpMenu />
      </div>
      <div className="ml-auto flex shrink-0 items-center pr-2">
        <button
          type="button"
          className={cn(
            MENU_TRIGGER_CLASS,
            "inline-flex items-center gap-1.5 rounded-sm px-2",
          )}
          onClick={() => onOpenCommandPalette?.()}
        >
          <Search size={14} strokeWidth={1.75} aria-hidden />
          <span className="hidden sm:inline">Search actions</span>
          <MenuShortcut className="hidden md:inline">Ctrl+K</MenuShortcut>
        </button>
      </div>
    </nav>
  );
}
