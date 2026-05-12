import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceHome as WorkspaceHomeContent } from "@/features/workspace/components/workspace-home";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useStoredWorkspaces, workspaceStore } from "@/features/workspace/store/workspace-store";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useCurrentAccount } from "@/lib/auth-session";
import { listMineWorkspaceRows } from "@/api/adapters/workspaces";

const WorkspaceHomePage = () => {
  const { workspaceId: paramId } = useParams<{ workspaceId: string }>();
  const workspaceId = paramId?.trim() ?? "";
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const stored = useStoredWorkspaces();
  const account = useCurrentAccount();
  const { sidebar, myRole, isLoading, isError, refetch } = useWorkspaceRouteContext();

  const mineQ = useQuery({
    queryKey: ["workspaces", "mine"],
    queryFn: listMineWorkspaceRows,
    staleTime: 30_000,
  });

  const mineRow = useMemo(
    () => mineQ.data?.find((r) => r.workspace.id === workspaceId),
    [mineQ.data, workspaceId],
  );

  const workspace = useMemo(() => {
    if (!sidebar) return null;
    return {
      ...sidebar,
      memberCount: mineRow?.memberCount ?? 0,
      documentCount: mineRow?.documentCount,
    };
  }, [sidebar, mineRow]);

  const fromStore = useMemo(
    () => (workspaceId ? stored.find((w) => w.id === workspaceId) : undefined),
    [stored, workspaceId],
  );

  const currentUser = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

  useEffect(() => {
    if (sidebar?.name) {
      document.title = `${sidebar.name} — CollabSphere`;
    }
  }, [sidebar?.name]);

  useEffect(() => {
    if (workspaceId && workspaceStore.getById({ workspaceId })) {
      workspaceStore.touch({ workspaceId });
    }
  }, [workspaceId]);

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

  if (isError || !sidebar || !myRole || !workspace) {
    return (
      <div className="app-light min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-stone-700 font-medium">Couldn’t load this workspace.</p>
        <button
          type="button"
          onClick={() => {
            void mineQ.refetch();
            refetch();
          }}
          className="h-10 px-4 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-500"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app-light min-h-screen flex">
      <WorkspaceSidebar workspace={sidebar} collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav user={currentUser} unreadCount={3} onOpenPalette={palette.toggle} />
        <WorkspaceHomeContent
          workspace={workspace}
          templateName={fromStore?.templateName ?? null}
        />
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default WorkspaceHomePage;
