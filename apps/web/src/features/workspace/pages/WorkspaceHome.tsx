import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { ApiError } from "@/api/client";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";

const WorkspaceHomePage = () => {
  const { workspaceId: paramId } = useParams<{ workspaceId: string }>();
  const workspaceId = paramId?.trim() ?? "";
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const stored = useStoredWorkspaces();
  const account = useCurrentAccount();
  const { sidebar, myRole, isLoading, isError, accessDenied, error, refetch } = useWorkspaceRouteContext();

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
    if (!accessDenied || !workspaceId) return;
    if (workspaceStore.getById({ workspaceId })) {
      workspaceStore.remove({ workspaceId });
    }
    toast.error("You are not a member of this workspace.", {
      description: "Accept an invitation first, or pick a workspace from your list.",
    });
    navigate("/workspaces", { replace: true });
  }, [accessDenied, navigate, workspaceId]);

  useEffect(() => {
    if (workspaceId && workspaceStore.getById({ workspaceId })) {
      workspaceStore.touch({ workspaceId });
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || isDatabaseWorkspaceId(workspaceId)) return;
    if (mineQ.isLoading || mineQ.isFetching) return;
    const first = mineQ.data?.[0]?.workspace?.id;
    const target =
      (first && isDatabaseWorkspaceId(first) ? first : null) ??
      (account?.defaultWorkspaceId && isDatabaseWorkspaceId(account.defaultWorkspaceId)
        ? account.defaultWorkspaceId
        : null);
    if (!target) return;
    const path = location.pathname.replace(
      `/w/${encodeURIComponent(workspaceId)}`,
      `/w/${target}`,
    );
    if (path !== location.pathname) {
      navigate(`${path}${location.search}`, { replace: true });
    }
  }, [
    workspaceId,
    mineQ.isLoading,
    mineQ.isFetching,
    mineQ.data,
    account?.defaultWorkspaceId,
    location.pathname,
    location.search,
    navigate,
  ]);

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
    const authErr =
      error instanceof ApiError &&
      (error.status === 401 || error.code === "TOKEN_INVALID" || error.code === "TOKEN_EXPIRED");
    const denied = accessDenied || (error instanceof ApiError && error.code === "NOT_WORKSPACE_MEMBER");
    return (
      <div className="app-light min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-stone-700 font-medium">
          {authErr
            ? "Your session is no longer valid."
            : denied
              ? "You do not have access to this workspace."
              : "Couldn’t load this workspace."}
        </p>
        {authErr ? (
          <p className="text-sm text-stone-600 max-w-md">
            Sign out and sign in again. The API rejected your access token (for example after changing{" "}
            <span className="font-mono text-xs">JWT_ACCESS_SECRET</span>).
          </p>
        ) : denied ? (
          <p className="text-sm text-stone-600 max-w-md">
            If you were invited, accept the invitation from the Workspaces page. Otherwise ask an admin to add you.
          </p>
        ) : (
          <p className="text-sm text-stone-600 max-w-md">
            {error instanceof Error ? error.message : "You may not be a member of this workspace, or it may not exist."}
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          {authErr && (
            <Link
              to={`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="h-10 px-4 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-500 inline-flex items-center"
            >
              Sign in
            </Link>
          )}
          {!denied && (
            <button
              type="button"
              onClick={() => {
                void mineQ.refetch();
                refetch();
              }}
              className="h-10 px-4 rounded-lg border border-stone-200 bg-white text-stone-800 text-sm font-medium hover:bg-stone-50"
            >
              Retry
            </button>
          )}
          <Link
            to="/workspaces"
            className="h-10 px-4 rounded-lg border border-stone-200 bg-white text-stone-800 text-sm font-medium hover:bg-stone-50 inline-flex items-center"
          >
            My workspaces
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-light min-h-screen flex">
      <WorkspaceSidebar workspace={sidebar} collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav user={currentUser} onOpenPalette={palette.toggle} />
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
