import {
  AlertTriangle,
  FileText,
  LayoutList,
  ListTree,
  Lock,
  MessageSquare,
  Scissors,
  ScrollText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { OutlineNode } from "@/features/documents/hooks/use-document-outline";
import type { OutlineBadge, V2RegionIcon } from "@/features/documents/hooks/use-v2-document-outline";
import type { OutlineRailItem } from "@/features/documents/components/editor/editor-outline-rail";
import { EditorRailEmptyState } from "@/features/documents/components/editor/editor-rail-chrome";
import {
  flattenOutlineForSearch,
  groupOutlineForToc,
  type OutlineTocGroup,
} from "@/features/documents/lib/group-outline-for-toc";

const REGION_ICON_MAP: Record<V2RegionIcon, typeof FileText> = {
  "file-text": FileText,
  "list-tree": ListTree,
  "layout-list": LayoutList,
  scissors: Scissors,
  "message-square": MessageSquare,
};

function RegionBadges({ badges }: { badges?: OutlineBadge[] }) {
  if (!badges?.length) return null;
  return (
    <span className="ml-auto flex shrink-0 items-center gap-0.5">
      {badges.includes("lock") && (
        <Lock className="!size-3.5 text-stone-400" aria-label="Locked" />
      )}
      {badges.includes("warning") && (
        <AlertTriangle className="!size-3.5 text-amber-500" aria-label="Required section empty" />
      )}
      {badges.includes("gear") && (
        <Settings className="!size-3.5 text-stone-400" aria-label="Auto-generated" />
      )}
    </span>
  );
}

interface DocumentShadcnOutlineTreeProps {
  outline: OutlineRailItem[];
  activeId?: string | null;
  isV2Template: boolean;
  searchQuery: string;
  onJump: (node: OutlineNode) => void;
}

function TocSubItem({
  node,
  activeId,
  onJump,
}: {
  node: OutlineRailItem;
  activeId?: string | null;
  onJump: (node: OutlineNode) => void;
}) {
  const isActive = activeId === node.id;
  const isEmpty = node.text === "" || node.text === "(empty heading)";

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        size="md"
        isActive={isActive}
        onClick={() => onJump(node)}
        className={cn(isEmpty && !isActive && "italic text-[var(--editor-text-muted)]")}
        title={node.text || "(empty heading)"}
      >
        <span className="line-clamp-2">{node.text || "(empty heading)"}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function TocGroupSection({
  group,
  activeId,
  onJump,
}: {
  group: OutlineTocGroup;
  activeId?: string | null;
  onJump: (node: OutlineNode) => void;
}) {
  const region = group.region;
  const RegionIcon = region?.regionIcon ? REGION_ICON_MAP[region.regionIcon] : null;
  const parentActive = region ? activeId === region.id : false;
  const showSubs = group.items.length > 0;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="default"
        isActive={parentActive && !showSubs}
        className="font-medium"
        onClick={() => {
          if (region) onJump(region);
        }}
      >
        {RegionIcon && <RegionIcon className="!size-4 shrink-0 text-teal-600" />}
        <span className="truncate">{group.title}</span>
        {region?.badges && <RegionBadges badges={region.badges} />}
      </SidebarMenuButton>
      {showSubs && (
        <SidebarMenuSub className="border-l border-stone-200/80">
          {group.items.map((node) => (
            <TocSubItem key={`${node.id}-${node.pos}`} node={node} activeId={activeId} onJump={onJump} />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

export function DocumentShadcnOutlineTree({
  outline,
  activeId,
  isV2Template,
  searchQuery,
  onJump,
}: DocumentShadcnOutlineTreeProps) {
  if (outline.length === 0) {
    return (
      <EditorRailEmptyState
        icon={ScrollText}
        title="No outline yet"
        description="Add headings (H1, H2, H3…) to build a navigable table of contents."
      />
    );
  }

  const isSearch = searchQuery.trim().length > 0;
  const groups = isSearch
    ? flattenOutlineForSearch(outline)
    : groupOutlineForToc(outline, isV2Template);

  const visibleGroups = isSearch
    ? groups
    : groups.filter((g) => g.region || g.items.length > 0);

  if (visibleGroups.length === 0) {
    return (
      <EditorRailEmptyState
        icon={ScrollText}
        title="No matches"
        description="Try a different search term."
      />
    );
  }

  return (
    <SidebarGroup className="p-2">
      <SidebarGroupLabel className="text-[var(--editor-text-secondary)]">
        Table of contents
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {visibleGroups.map((group) => (
            <TocGroupSection
              key={group.id}
              group={group}
              activeId={activeId}
              onJump={onJump}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
