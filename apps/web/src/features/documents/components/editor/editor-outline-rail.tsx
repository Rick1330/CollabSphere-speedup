/**
 * DocumentOutlineRail — in-document table of contents for the left sidebar.
 */
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
import type { OutlineNode } from "@/features/documents/hooks/use-document-outline";
import type { OutlineBadge, V2RegionIcon } from "@/features/documents/hooks/use-v2-document-outline";
import { EditorRailEmptyState } from "@/features/documents/components/editor/editor-rail-chrome";

const REGION_ICON_MAP: Record<V2RegionIcon, typeof FileText> = {
  "file-text": FileText,
  "list-tree": ListTree,
  "layout-list": LayoutList,
  scissors: Scissors,
  "message-square": MessageSquare,
};

export interface OutlineRailItem extends OutlineNode {
  regionIcon?: V2RegionIcon;
  badges?: OutlineBadge[];
}

interface DocumentOutlineRailProps {
  outline: OutlineRailItem[];
  activeId?: string | null;
  onJump: (node: OutlineNode) => void;
}

function LevelPill({ level }: { level: number }) {
  return (
    <span
      className="shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold leading-none text-[var(--editor-accent-text)] bg-[var(--editor-accent-lighter)]"
      aria-hidden="true"
    >
      H{level}
    </span>
  );
}

export const DocumentOutlineRail = ({
  outline,
  activeId,
  onJump,
}: DocumentOutlineRailProps) => {
  if (outline.length === 0) {
    return (
      <EditorRailEmptyState
        icon={ScrollText}
        title="No outline yet"
        description="Add headings (H1, H2, H3…) to build a navigable map of your document."
      />
    );
  }

  return (
    <nav aria-label="Document outline" className="px-2 py-2">
      <ul className="space-y-0.5 text-[13px]">
        {outline.map((n) => {
          const isActive = activeId === n.id;
          const isEmpty = n.text === "" || n.text === "(empty heading)";
          const RegionIcon = n.regionIcon ? REGION_ICON_MAP[n.regionIcon] : null;
          const showLevelPill = !n.regionIcon && n.level >= 1 && n.level <= 6;

          return (
            <li key={`${n.id}-${n.pos}`}>
              <button
                type="button"
                onClick={() => onJump(n)}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-lg border-l-[3px] py-1.5 pr-2 text-left transition-all duration-150",
                  isActive
                    ? "border-l-[var(--editor-accent)] bg-[var(--editor-surface-active)] text-[var(--editor-accent-text)] shadow-sm ring-1 ring-teal-200/50 font-medium"
                    : "border-l-transparent text-[var(--editor-text-secondary)] hover:bg-[var(--editor-surface-hover)] hover:text-[var(--editor-text-primary)]",
                  isEmpty && !isActive && "italic text-[var(--editor-text-muted)]",
                )}
                style={{ paddingLeft: `${10 + Math.max(0, n.level - 1) * 10}px` }}
                title={n.text || "(empty heading)"}
              >
                {RegionIcon ? (
                  <RegionIcon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive ? "text-[var(--editor-accent)]" : "text-[var(--editor-text-muted)]",
                    )}
                    aria-hidden="true"
                  />
                ) : showLevelPill ? (
                  <LevelPill level={n.level} />
                ) : (
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isActive ? "bg-[var(--editor-accent)]" : "bg-stone-300",
                    )}
                    aria-hidden="true"
                  />
                )}
                <span className="line-clamp-2 min-w-0 flex-1 leading-snug">
                  {n.text || "(empty heading)"}
                </span>
                {n.badges?.includes("lock") && (
                  <Lock className="h-3 w-3 shrink-0 text-stone-400" aria-label="Locked" />
                )}
                {n.badges?.includes("warning") && (
                  <AlertTriangle
                    className="h-3 w-3 shrink-0 text-amber-500"
                    aria-label="Required section empty"
                  />
                )}
                {n.badges?.includes("gear") && (
                  <Settings className="h-3 w-3 shrink-0 text-stone-400" aria-label="Auto-generated" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
