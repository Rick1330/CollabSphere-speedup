import {
  Activity,
  BarChart3,
  CheckSquare,
  ClipboardCheck,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  Lock,
  Send,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceForSidebar } from "./workspace-sidebar";
import { canReviewAcademic, canSubmitAcademic } from "@/lib/academic-capabilities";

export type WorkspaceNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  locked?: boolean;
  lockedTitle?: string;
  badgeCount?: number;
};

type WorkspaceNavBadges = {
  reviewPending?: number;
  submissionActive?: number;
};

export function getWorkspaceNavItems(
  workspace: WorkspaceForSidebar,
  badges?: WorkspaceNavBadges,
): WorkspaceNavItem[] {
  const base = `/w/${workspace.id}`;
  const items: WorkspaceNavItem[] = [
    { to: base, label: "Overview", icon: LayoutDashboard, end: true },
    { to: `${base}/documents`, label: "Documents", icon: FileText },
    { to: `${base}/tasks`, label: "Tasks", icon: CheckSquare },
    { to: `${base}/members`, label: "Members", icon: Users },
    { to: `${base}/activity`, label: "Activity", icon: Activity },
    { to: `${base}/files`, label: "Files", icon: FolderOpen },
  ];

  if (workspace.permissions.canViewAnalytics) {
    items.push({ to: `${base}/analytics`, label: "Analytics", icon: BarChart3 });
  } else {
    items.push({
      to: `${base}/analytics`,
      label: "Analytics",
      icon: BarChart3,
      locked: true,
      lockedTitle: "Manager+ only",
    });
  }

  items.push({ to: `${base}/templates`, label: "Templates", icon: LayoutTemplate });

  if (workspace.permissions.canEditSettings) {
    items.push({ to: `${base}/settings`, label: "Settings", icon: Settings });
  } else {
    items.push({
      to: `${base}/settings`,
      label: "Settings",
      icon: Settings,
      locked: true,
      lockedTitle: "Admin+ only",
    });
  }

  const canReview = canReviewAcademic({
    workspaceType: workspace.type,
    myRole: workspace.role,
  });
  if (canReview) {
    items.push({
      to: `${base}/review`,
      label: "Review queue",
      icon: ClipboardCheck,
      badgeCount: badges?.reviewPending ?? 0,
    });
  }

  const canSubmit = canSubmitAcademic({
    workspaceType: workspace.type,
    myRole: workspace.role,
    canCreateContent: workspace.permissions.canCreateContent,
  });
  if (canSubmit) {
    items.push({
      to: `${base}/submissions`,
      label: "Submission center",
      icon: Send,
      badgeCount: badges?.submissionActive ?? 0,
    });
  }

  return items;
}

export { Lock };
