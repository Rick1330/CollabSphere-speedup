import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import {
  WorkspaceSidebar,
  type WorkspaceForSidebar,
} from "@/features/workspace/components/workspace-sidebar";
import { TaskCalendar } from "@/features/tasks/components/task-calendar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";

const MOCK_USER = { fullName: "Elshaday Tesfaye", email: "jane@collabsphere.app" };

type WorkspaceWithRole = WorkspaceForSidebar & {
  myRole: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
};

const WORKSPACES: Record<string, WorkspaceWithRole> = {
  alpha: {
    id: "alpha",
    name: "Project Alpha",
    description: "Building the next-gen collaboration platform.",
    icon: "📦",
    type: "professional",
    roleLabel: "TECH LEAD",
    status: "active",
    myRole: "ADMIN",
    permissions: {
      canCreateContent: true,
      canOrganizeContent: true,
      canDeleteContent: true,
      canEditSettings: true,
      canViewAnalytics: true,
    },
  },
};

const FALLBACK = WORKSPACES.alpha;

const TasksCalendarPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();

  const workspace = useMemo(
    () =>
      (workspaceId && WORKSPACES[workspaceId]) || {
        ...FALLBACK,
        id: workspaceId || "alpha",
      },
    [workspaceId],
  );

  useEffect(() => {
    document.title = `Tasks (Calendar) — ${workspace.name} — CollabSphere`;
  }, [workspace.name]);

  return (
    <div className="app-light min-h-screen flex bg-stone-50">
      <WorkspaceSidebar workspace={workspace} collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <TopNav user={MOCK_USER} onOpenPalette={palette.toggle} />

        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <TaskCalendar
            workspaceId={workspace.id}
            workspaceStatus={workspace.status}
            myRole={workspace.myRole}
          />
        </main>
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default TasksCalendarPage;
