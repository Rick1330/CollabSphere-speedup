import { BarChart3, Bookmark, FileStack, FolderTree, ListTree } from "lucide-react";
import { IconButton, cn } from "@/components/ui-kit";
import type { LeftSidebarTab } from "@/components/editor/state/editorStore";

const LEFT_ITEMS: { id: LeftSidebarTab; label: string; icon: typeof FolderTree }[] = [
  { id: "files", label: "Files", icon: FolderTree },
  { id: "pages", label: "Pages", icon: FileStack },
  { id: "outline", label: "Outline", icon: ListTree },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
  { id: "stats", label: "Stats", icon: BarChart3 },
];

export type LeftRailProps = {
  activeTab: LeftSidebarTab;
  panelOpen: boolean;
  onSelectTab: (tab: LeftSidebarTab) => void;
  className?: string;
};

export function LeftRail({ activeTab, panelOpen: _panelOpen, onSelectTab, className }: LeftRailProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)} role="tablist" aria-label="Left sidebar">
      {LEFT_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        return (
          <div key={id} className="cs-editor-rail-btn" data-active={isActive ? "true" : undefined}>
            <IconButton
              aria-label={label}
              tooltip={label}
              selected={isActive}
              onClick={() => onSelectTab(id)}
            >
              <Icon size={18} strokeWidth={1.75} />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
