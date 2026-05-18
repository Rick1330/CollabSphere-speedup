import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { WorkspaceMobileNav } from "@/features/workspace/components/workspace-mobile-nav";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useCurrentAccount } from "@/lib/auth-session";
import { fetchWorkspaceMemberPeerProfile } from "@/api/adapters/members";
import { getWorkspaceRoleLabel } from "@/lib/role-labels";
import { getInitials, getAvatarColor, fullDateTime, relativeTime } from "@/lib/format";

const WorkspaceMemberProfile = () => {
  const { workspaceId = "", userId = "" } = useParams<{ workspaceId: string; userId: string }>();
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const account = useCurrentAccount();
  const { sidebar, myRole, isLoading, isError, refetch } = useWorkspaceRouteContext();

  const currentUser = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

  const profileQuery = useQuery({
    queryKey: ["workspace", workspaceId, "member-profile", userId],
    queryFn: () => fetchWorkspaceMemberPeerProfile(workspaceId, userId),
    enabled: Boolean(workspaceId && userId && sidebar),
  });

  useEffect(() => {
    if (sidebar?.name && profileQuery.data?.user.fullName) {
      document.title = `${profileQuery.data.user.fullName} — ${sidebar.name} — CollabSphere`;
    }
  }, [sidebar?.name, profileQuery.data?.user.fullName]);

  if (!workspaceId || !userId) {
    return (
      <div className="app-light min-h-screen flex items-center justify-center text-stone-500 text-sm">
        Missing workspace or member in URL.
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
        <p className="text-stone-700 font-medium">Couldn’t load this workspace.</p>
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

  const baseMembers = `/w/${workspaceId}/members`;

  return (
    <div className="app-light min-h-screen flex bg-stone-50">
      <WorkspaceSidebar workspace={sidebar} collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <TopNav user={currentUser} onOpenPalette={palette.toggle} />
        <WorkspaceMobileNav workspace={sidebar} />

        <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-10 py-8 max-w-2xl mx-auto w-full">
          <Link
            to={baseMembers}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800 mb-6"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to members
          </Link>

          {profileQuery.isLoading && (
            <div className="flex items-center gap-2 text-stone-500 text-sm" aria-busy="true">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading profile…
            </div>
          )}

          {profileQuery.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-800">
              Couldn’t load this member profile. They may have left the workspace.
            </div>
          )}

          {profileQuery.data && (
            <div className="rounded-xl border border-stone-200 bg-white shadow-sm p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(profileQuery.data.user.id) }}
                  aria-hidden="true"
                >
                  {getInitials(profileQuery.data.user.fullName, 2)}
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold text-stone-900 truncate">
                    {profileQuery.data.user.fullName}
                  </h1>
                  <p className="text-sm text-stone-500 truncate">{profileQuery.data.user.email}</p>
                  <p className="mt-2 text-xs font-mono tracking-wider uppercase text-stone-500">
                    {getWorkspaceRoleLabel(sidebar.type, profileQuery.data.role)}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm border-t border-stone-100 pt-4">
                <div>
                  <dt className="text-stone-500">Joined</dt>
                  <dd className="font-medium text-stone-900">
                    <time dateTime={profileQuery.data.joinedAt} title={fullDateTime(profileQuery.data.joinedAt)}>
                      {relativeTime(profileQuery.data.joinedAt)}
                    </time>
                  </dd>
                </div>
                {profileQuery.data.lastAccessedAt && (
                  <div>
                    <dt className="text-stone-500">Last active</dt>
                    <dd className="font-medium text-stone-900">
                      <time
                        dateTime={profileQuery.data.lastAccessedAt}
                        title={fullDateTime(profileQuery.data.lastAccessedAt)}
                      >
                        {relativeTime(profileQuery.data.lastAccessedAt)}
                      </time>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </main>
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default WorkspaceMemberProfile;
