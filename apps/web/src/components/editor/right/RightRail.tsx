import { CheckSquare, History, MessageSquare, Users } from "lucide-react";
import { IconButton, cn } from "@/components/ui-kit";
import type { RightSidebarTab } from "@/components/editor/state/editorStore";

const RIGHT_ITEMS: {
  id: RightSidebarTab;
  label: string;
  icon: typeof MessageSquare;
  badge?: (ctx: { openCount: number }) => number | undefined;
}[] = [
  { id: "comments", label: "Comments", icon: MessageSquare, badge: (c) => c.openCount || undefined },
  { id: "team", label: "Team", icon: Users },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "activity", label: "Activity", icon: History },
];

export type RightRailProps = {
  activeTab: RightSidebarTab;
  panelOpen: boolean;
  openCount?: number;
  onSelectTab: (tab: RightSidebarTab) => void;
  className?: string;
};

export function RightRail({
  activeTab,
  panelOpen: _panelOpen,
  openCount = 0,
  onSelectTab,
  className,
}: RightRailProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)} role="tablist" aria-label="Context panel">
      {RIGHT_ITEMS.map(({ id, label, icon: Icon, badge }) => {
        const isActive = activeTab === id;
        const count = badge?.({ openCount });
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
            {count != null && count > 0 && !isActive && (
              <span className="cs-editor-rail-badge">{count > 9 ? "9+" : count}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
