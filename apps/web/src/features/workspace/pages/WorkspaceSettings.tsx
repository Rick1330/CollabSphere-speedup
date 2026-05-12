import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceSettings } from "@/features/workspace/components/settings/workspace-settings";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useCurrentAccount } from "@/lib/auth-session";
import { resolveWorkspaceParam } from "@/lib/route-params";

const WorkspaceSettingsPage = () => {
  const params = useParams<{ workspaceId: string }>();
  const resolvedId = resolveWorkspaceParam(params.workspaceId);
  const location = useLocation();
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const account = useCurrentAccount();
  const { workspaceId, sidebar, myRole, isLoading, isError, refetch } = useWorkspaceRouteContext();

  const currentUser = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

  useEffect(() => {
    if (sidebar?.name) {
      document.title = `Settings — ${sidebar.name} — CollabSphere`;
    }
  }, [sidebar?.name]);

  if (!resolvedId) {
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
        <p className="text-stone-700 font-medium">Couldn’t load workspace settings.</p>
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
        <TopNav user={currentUser} unreadCount={3} onOpenPalette={palette.toggle} />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <WorkspaceSettings
            workspaceId={workspaceId}
            myRole={myRole}
            initialTab={location.pathname.endsWith("/settings/members") ? "members" : "general"}
            fallback={{
              name: sidebar.name,
              description: sidebar.description,
              icon: sidebar.icon,
              type: sidebar.type,
              status: sidebar.status,
            }}
          />
        </main>
      </div>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default WorkspaceSettingsPage;
