import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceMobileNav } from "@/features/workspace/components/workspace-mobile-nav";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useWorkspaceRealtime } from "@/hooks/use-workspace-realtime";
import { useCurrentAccount } from "@/lib/auth-session";

const Activity = () => {
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const account = useCurrentAccount();
  const { workspaceId, sidebar, isLoading, isError, refetch } = useWorkspaceRouteContext();
  useWorkspaceRealtime(workspaceId);

  useEffect(() => {
    if (sidebar?.name) {
      document.title = `Activity — ${sidebar.name} — CollabSphere`;
    }
  }, [sidebar?.name]);

  const currentUser = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

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

  if (isError || !sidebar) {
    return (
      <div className="app-light min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-stone-700 font-medium">Couldn’t load workspace activity.</p>
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

        <main className="flex-1 min-h-0 overflow-y-auto">
          <ActivityFeed workspaceId={workspaceId} />
        </main>
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default Activity;
