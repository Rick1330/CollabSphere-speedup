import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  History,
  Lock,
  Maximize2,
  MessageSquare,
  Minimize2,
  MoreHorizontal,
  PanelLeft,
  Trash2,
  Unlock,
} from "lucide-react";
import {
  Badge,
  IconButton,
  Inline,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
  cn,
} from "@/components/ui-kit";
import {
  EditorPresence,
  type PresenceUser,
} from "@/features/documents/components/editor/editor-presence";
import { DocPill } from "./DocPill";
import type { ConnectionStatus, SaveStatus } from "./StatusBar";

export type DocStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "archived";

export interface EditorDocument {
  id: string;
  title: string;
  status: DocStatus;
  isLocked: boolean;
  lockedBy?: { id: string; fullName: string };
  folderName?: string | null;
}

export type TopBarProps = {
  workspaceId: string;
  workspaceName?: string;
  document: EditorDocument;
  presence: PresenceUser[];
  saveStatus?: SaveStatus;
  connectionStatus?: ConnectionStatus;
  onTitleChange?: (title: string) => void;
  canLock: boolean;
  canDelete: boolean;
  onToggleLock: () => void;
  onDelete: () => void;
  onToggleTree?: () => void;
  treeOpen?: boolean;
  onToggleFocusMode?: () => void;
  focusMode?: boolean;
  onToggleComments?: () => void;
  commentsOpen?: boolean;
  commentsOpenCount?: number;
  submitSlot?: React.ReactNode;
  onOpenVersionHistory?: () => void;
  className?: string;
};

export function TopBar({
  workspaceId,
  workspaceName,
  document,
  presence,
  saveStatus = "saved",
  connectionStatus = "connected",
  onTitleChange,
  canLock,
  canDelete,
  onToggleLock,
  onDelete,
  onToggleTree,
  treeOpen = true,
  onToggleFocusMode,
  focusMode = false,
  onToggleComments,
  commentsOpen = true,
  commentsOpenCount = 0,
  submitSlot,
  onOpenVersionHistory,
  className,
}: TopBarProps) {
  const [titleDraft, setTitleDraft] = useState(document.title);

  useEffect(() => {
    setTitleDraft(document.title);
  }, [document.title]);

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(document.title);
      return;
    }
    if (trimmed !== document.title) {
      onTitleChange?.(trimmed);
    }
  };

  return (
    <div
      className={cn(
        "cs-editor-topbar flex h-full items-center justify-between gap-3 px-3 sm:px-4",
        className,
      )}
    >
      <Inline gap={3} className="min-w-0 flex-1">
        {onToggleTree && (
          <IconButton
            aria-label="Toggle document tree"
            tooltip="Toggle document tree"
            selected={treeOpen}
            onClick={onToggleTree}
            className="lg:hidden"
          >
            <PanelLeft size={16} strokeWidth={1.75} />
          </IconButton>
        )}
        <Link
          to={`/w/${workspaceId}`}
          className="hidden lg:flex cs-kit-focus rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-strong)]"
          aria-label="Back to workspace"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
        </Link>

        <div className="hidden sm:block h-6 w-px bg-[var(--border-subtle)]" aria-hidden />

        <div className="min-w-0 flex flex-col gap-0.5">
          <nav aria-label="Document breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 flex-wrap items-center gap-1 text-[length:var(--text-sm-size)] leading-[var(--text-sm-line)] text-[var(--text-muted)]">
              <li className="hidden sm:inline-flex">
                <Link
                  to={`/w/${workspaceId}`}
                  className="truncate max-w-[8rem] transition-colors hover:text-[var(--text-strong)]"
                >
                  {workspaceName ?? "Workspace"}
                </Link>
              </li>
              <li aria-hidden className="hidden sm:inline-flex">
                <ChevronRight size={12} strokeWidth={1.75} />
              </li>
              <li className="hidden md:inline-flex">
                <Link
                  to={`/w/${workspaceId}/documents`}
                  className="truncate transition-colors hover:text-[var(--text-strong)]"
                >
                  Documents
                </Link>
              </li>
              {document.folderName && (
                <>
                  <li aria-hidden className="hidden md:inline-flex">
                    <ChevronRight size={12} strokeWidth={1.75} />
                  </li>
                  <li className="hidden truncate max-w-[10rem] md:inline">
                    {document.folderName}
                  </li>
                </>
              )}
            </ol>
          </nav>

          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                setTitleDraft(document.title);
                e.currentTarget.blur();
              }
            }}
            disabled={!onTitleChange}
            className="cs-editor-topbar__title cs-kit-focus min-w-0 max-w-full truncate border-0 bg-transparent p-0 font-semibold text-[length:var(--text-xl-size)] leading-[var(--text-xl-line)] text-[var(--text-strong)] outline-none disabled:cursor-default"
            aria-label="Document title"
            title={document.title}
          />
        </div>

        <DocPill
          saveStatus={saveStatus}
          connectionStatus={connectionStatus}
          collaboratorCount={presence.length}
          className="hidden shrink-0 sm:inline-flex"
        />

        <Inline gap={1} className="hidden shrink-0 lg:flex">
          {document.isLocked && (
            <Badge variant="warning" title={document.lockedBy ? `Locked by ${document.lockedBy.fullName}` : "Locked"}>
              <Lock size={12} aria-hidden />
              Locked
            </Badge>
          )}
          {document.status !== "draft" && (
            <Badge
              variant={
                document.status === "approved"
                  ? "success"
                  : document.status === "changes_requested"
                    ? "danger"
                    : document.status === "submitted"
                      ? "warning"
                      : "neutral"
              }
            >
              {document.status === "changes_requested" ? "Changes" : document.status}
            </Badge>
          )}
        </Inline>
      </Inline>

      <Inline gap={2} className="shrink-0">
        <EditorPresence users={presence} />

        {submitSlot}

        {onToggleComments && (
          <div className="relative">
            <IconButton
              aria-label={commentsOpen ? "Hide comments" : "Show comments"}
              tooltip={commentsOpen ? "Hide comments" : "Show comments"}
              selected={commentsOpen}
              pressed={commentsOpen}
              onClick={onToggleComments}
            >
              <MessageSquare size={16} strokeWidth={1.75} />
            </IconButton>
            {commentsOpenCount > 0 && !commentsOpen && (
              <span className="cs-editor-rail-badge">
                {commentsOpenCount > 9 ? "9+" : commentsOpenCount}
              </span>
            )}
          </div>
        )}

        {onToggleFocusMode && (
          <IconButton
            aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
            tooltip={focusMode ? "Exit focus mode (⌘.)" : "Focus mode (⌘.)"}
            pressed={focusMode}
            onClick={onToggleFocusMode}
            className="hidden md:inline-flex"
          >
            {focusMode ? (
              <Minimize2 size={16} strokeWidth={1.75} />
            ) : (
              <Maximize2 size={16} strokeWidth={1.75} />
            )}
          </IconButton>
        )}

        <Menu>
          <MenuTrigger asChild>
            <IconButton aria-label="Document actions" tooltip="More actions">
              <MoreHorizontal size={16} strokeWidth={1.75} />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="end" className="w-52">
            <MenuItem onSelect={() => onOpenVersionHistory?.()}>
              <History size={16} className="text-[var(--text-muted)]" />
              Version history
              <MenuShortcut>Ctrl+Alt+H</MenuShortcut>
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => window.print()}>
              <Download size={16} className="text-[var(--text-muted)]" />
              Export as PDF
            </MenuItem>
            {canLock && (
              <>
                <MenuSeparator />
                <MenuItem onSelect={onToggleLock}>
                  {document.isLocked ? (
                    <>
                      <Unlock size={16} className="text-[var(--text-muted)]" />
                      Unlock document
                    </>
                  ) : (
                    <>
                      <Lock size={16} className="text-[var(--text-muted)]" />
                      Lock document
                    </>
                  )}
                </MenuItem>
              </>
            )}
            {canDelete && (
              <>
                <MenuSeparator />
                <MenuItem
                  className="text-[var(--danger)] focus:text-[var(--danger)]"
                  onSelect={onDelete}
                >
                  <Trash2 size={16} />
                  Delete document
                </MenuItem>
              </>
            )}
          </MenuContent>
        </Menu>
      </Inline>
    </div>
  );
}
