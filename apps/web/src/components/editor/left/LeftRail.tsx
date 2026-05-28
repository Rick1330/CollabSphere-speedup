import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Bookmark,
  ClipboardCheck,
  FileStack,
  FolderTree,
  ListTree,
  Send,
} from "lucide-react";
import { IconButton, cn } from "@/components/ui-kit";
import type { LeftSidebarTab } from "@/features/documents/stores/use-editor-store";

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
  showReviewTab?: boolean;
  showSubmissionsTab?: boolean;
  reviewBadgeCount?: number;
  submissionsBadgeCount?: number;
};

export function LeftRail({
  activeTab,
  panelOpen: _panelOpen,
  onSelectTab,
  className,
  showReviewTab = false,
  showSubmissionsTab = false,
  reviewBadgeCount = 0,
  submissionsBadgeCount = 0,
}: LeftRailProps) {
  const prevReviewCount = useRef(reviewBadgeCount);
  const prevSubmissionCount = useRef(submissionsBadgeCount);
  const lastReviewGlowAt = useRef(0);
  const lastSubmissionGlowAt = useRef(0);
  const [reviewGlow, setReviewGlow] = useState(false);
  const [submissionGlow, setSubmissionGlow] = useState(false);

  useEffect(() => {
    if (reviewBadgeCount > prevReviewCount.current) {
      const now = Date.now();
      if (now - lastReviewGlowAt.current < 1500) {
        prevReviewCount.current = reviewBadgeCount;
        return;
      }
      lastReviewGlowAt.current = now;
      setReviewGlow(true);
      const t = window.setTimeout(() => setReviewGlow(false), 2200);
      prevReviewCount.current = reviewBadgeCount;
      return () => window.clearTimeout(t);
    }
    prevReviewCount.current = reviewBadgeCount;
  }, [reviewBadgeCount]);

  useEffect(() => {
    if (submissionsBadgeCount > prevSubmissionCount.current) {
      const now = Date.now();
      if (now - lastSubmissionGlowAt.current < 1500) {
        prevSubmissionCount.current = submissionsBadgeCount;
        return;
      }
      lastSubmissionGlowAt.current = now;
      setSubmissionGlow(true);
      const t = window.setTimeout(() => setSubmissionGlow(false), 2200);
      prevSubmissionCount.current = submissionsBadgeCount;
      return () => window.clearTimeout(t);
    }
    prevSubmissionCount.current = submissionsBadgeCount;
  }, [submissionsBadgeCount]);

  const items = [...LEFT_ITEMS];
  if (showReviewTab) {
    items.push({ id: "review", label: "Review queue", icon: ClipboardCheck });
  }
  if (showSubmissionsTab) {
    items.push({ id: "submissions", label: "Submission center", icon: Send });
  }

  return (
    <div className={cn("flex flex-col items-center gap-1", className)} role="tablist" aria-label="Left sidebar">
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;
        const badgeCount = id === "review" ? reviewBadgeCount : id === "submissions" ? submissionsBadgeCount : 0;
        const glow = id === "review" ? reviewGlow : id === "submissions" ? submissionGlow : false;
        return (
          <div
            key={id}
            className={cn("cs-editor-rail-btn relative", glow && "cs-editor-rail-btn--glow")}
            data-active={isActive ? "true" : undefined}
          >
            <IconButton
              aria-label={label}
              tooltip={label}
              selected={isActive}
              onClick={() => onSelectTab(id)}
            >
              <Icon size={18} strokeWidth={1.75} />
            </IconButton>
            {badgeCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1 inline-flex items-center justify-center shadow-sm">
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
