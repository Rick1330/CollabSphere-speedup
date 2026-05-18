import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceMobileNav } from "@/features/workspace/components/workspace-mobile-nav";
import { TaskBoard } from "@/features/tasks/components/task-board";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useCurrentAccount } from "@/lib/auth-session";

const Tasks = () => {
  const params = useParams<{ workspaceId: string }>();
  const paramWorkspaceId = params.workspaceId?.trim() ?? "";
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const isMobile = useIsMobile();
  const account = useCurrentAccount();
  const { workspaceId, sidebar, myRole, isLoading, isError, refetch } = useWorkspaceRouteContext();

  useEffect(() => {
    if (sidebar?.name) {
      document.title = `Tasks — ${sidebar.name} — CollabSphere`;
    }
  }, [sidebar?.name]);

  const currentUser = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

  if (isMobile && paramWorkspaceId) {
    return <Navigate to={`/w/${paramWorkspaceId}/tasks/list`} replace />;
  }

  if (!workspaceId) {
    return (
      <div className="app-light min-h-screen flex items-center justify-center text-stone-500 text-sm">
        Missing workspace in URL.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="app-light min-h-screen flex items-center justify-center gap-2 text-stone-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading workspace…
      </div>
    );
  }

  if (isError || !sidebar || !myRole) {
    return (
      <div className="app-light min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-stone-700 font-medium">Couldn’t load tasks for this workspace.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="h-10 px-4 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app-light min-h-screen flex bg-stone-50">
      <WorkspaceSidebar workspace={sidebar} collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <TopNav user={currentUser} onOpenPalette={palette.toggle} />
        <WorkspaceMobileNav workspace={sidebar} />

        <main className="flex-1 min-h-0 flex flex-col">
          <TaskBoard
            workspaceId={workspaceId}
            workspaceName={sidebar.name}
            workspaceStatus={sidebar.status}
            myRole={myRole}
          />
        </main>
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default Tasks;
