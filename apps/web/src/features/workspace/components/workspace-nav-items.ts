import {
  Activity,
  BarChart3,
  CheckSquare,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  Lock,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { WorkspaceForSidebar } from "./workspace-sidebar";

export type WorkspaceNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  locked?: boolean;
  lockedTitle?: string;
};

export function getWorkspaceNavItems(workspace: WorkspaceForSidebar): WorkspaceNavItem[] {
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

  return items;
}

export { Lock };
