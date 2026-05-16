import { useState } from "react";
import {
  MoreHorizontal,
  FilePlus,
  FolderPlus,
  FolderInput,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { TreeContentPermissions } from "@/features/documents/components/document-tree";

type FolderActions = {
  type: "folder";
  name: string;
  onNewDoc?: () => void;
  onNewFolder?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
};

type DocumentActions = {
  type: "document";
  name: string;
  onOpen?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
};

type TreeContextMenuProps = {
  permissions: TreeContentPermissions;
  children: React.ReactNode;
} & (FolderActions | DocumentActions);

function hasActions(props: FolderActions | DocumentActions, permissions: TreeContentPermissions) {
  if (props.type === "folder") {
    return (
      (permissions.canCreateContent && (props.onNewDoc || props.onNewFolder)) ||
      (permissions.canOrganizeContent && (props.onRename || props.onMove)) ||
      (permissions.canDeleteContent && props.onDelete)
    );
  }
  return (
    Boolean(props.onOpen) ||
    (permissions.canOrganizeContent && (props.onRename || props.onMove)) ||
    (permissions.canDeleteContent && props.onDelete)
  );
}

function buildItems(
  props: FolderActions | DocumentActions,
  permissions: TreeContentPermissions,
  run: (fn?: () => void) => void,
  surface: "context" | "dropdown",
) {
  const Item = surface === "context" ? ContextMenuItem : DropdownMenuItem;
  const Sep = surface === "context" ? ContextMenuSeparator : DropdownMenuSeparator;
  const canCreate = permissions.canCreateContent;
  const canOrganize = permissions.canOrganizeContent;
  const canDelete = permissions.canDeleteContent;
  const itemClass = (destructive?: boolean) =>
    `text-sm flex items-center gap-2 cursor-pointer ${
      destructive ? "text-red-600 focus:text-red-600 focus:bg-red-50" : ""
    }`;

  if (props.type === "folder") {
    return (
      <>
        {canCreate && props.onNewDoc && (
          <Item onSelect={() => run(props.onNewDoc)} className={itemClass()}>
            <FilePlus className="h-4 w-4 text-stone-500" />
            New document here
          </Item>
        )}
        {canCreate && props.onNewFolder && (
          <Item onSelect={() => run(props.onNewFolder)} className={itemClass()}>
            <FolderPlus className="h-4 w-4 text-stone-500" />
            New subfolder
          </Item>
        )}
        {canCreate && (props.onNewDoc || props.onNewFolder) && (canOrganize || canDelete) && <Sep />}
        {canOrganize && props.onRename && (
          <Item onSelect={() => run(props.onRename)} className={itemClass()}>
            <Pencil className="h-4 w-4 text-stone-500" />
            Rename
          </Item>
        )}
        {canOrganize && props.onMove && (
          <Item onSelect={() => run(props.onMove)} className={itemClass()}>
            <FolderInput className="h-4 w-4 text-stone-500" />
            Move to…
          </Item>
        )}
        {canDelete && props.onDelete && (
          <>
            {(canOrganize || canCreate) && <Sep />}
            <Item onSelect={() => run(props.onDelete)} className={itemClass(true)}>
              <Trash2 className="h-4 w-4" />
              Delete folder
            </Item>
          </>
        )}
      </>
    );
  }

  return (
    <>
      {props.onOpen && (
        <Item onSelect={() => run(props.onOpen)} className={itemClass()}>
          <ExternalLink className="h-4 w-4 text-stone-500" />
          Open
        </Item>
      )}
      {canOrganize && props.onRename && (
        <Item onSelect={() => run(props.onRename)} className={itemClass()}>
          <Pencil className="h-4 w-4 text-stone-500" />
          Rename
        </Item>
      )}
      {canOrganize && props.onMove && (
        <Item onSelect={() => run(props.onMove)} className={itemClass()}>
          <FolderInput className="h-4 w-4 text-stone-500" />
          Move to…
        </Item>
      )}
      {canDelete && props.onDelete && (
        <>
          {(canOrganize || props.onOpen) && <Sep />}
          <Item onSelect={() => run(props.onDelete)} className={itemClass(true)}>
            <Trash2 className="h-4 w-4" />
            Delete document
          </Item>
        </>
      )}
    </>
  );
}

/** Right-click on row (children) plus optional kebab trigger rendered beside the row. */
export const TreeContextMenu = ({
  permissions,
  children,
  showKebab = true,
  ...props
}: TreeContextMenuProps & { showKebab?: boolean }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!hasActions(props, permissions)) {
    return <>{children}</>;
  }

  const run = (fn?: () => void) => {
    fn?.();
    setDropdownOpen(false);
  };

  return (
    <div className="flex items-center shrink-0">
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48 bg-white border-stone-200">
          {buildItems(props, permissions, run, "context")}
        </ContextMenuContent>
      </ContextMenu>
      {showKebab && (
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-6 w-6 rounded flex items-center justify-center text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
              aria-label={`Actions for ${props.name}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-white border-stone-200"
            onClick={(e) => e.stopPropagation()}
          >
            {buildItems(props, permissions, run, "dropdown")}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
