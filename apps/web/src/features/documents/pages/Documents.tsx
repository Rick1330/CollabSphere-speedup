import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  FilePlus,
  FolderPlus,
  Folder,
  FileText,
  Sparkles,
  LayoutTemplate,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import {
  WorkspaceDocumentTree,
  type TreeNode,
} from "@/features/documents/components/document-tree";
import { useDocumentTree } from "@/features/documents/hooks/use-document-tree";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { CountChip, MetaStat, PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useCurrentAccount } from "@/lib/auth-session";
import { workspaceStore } from "@/features/workspace/store/workspace-store";

const Documents = () => {
  const params = useParams<{ workspaceId: string }>();
  const paramWorkspaceId = params.workspaceId?.trim() ?? "";
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const account = useCurrentAccount();
  const { workspaceId, sidebar, myRole, isLoading, isError, accessDenied, refetch } =
    useWorkspaceRouteContext();

  const currentUser = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

  const workspace = sidebar;

  const workspaceActive = workspace?.status === "active";
  const treePermissions = workspace
    ? {
        canCreateContent: workspaceActive && workspace.permissions.canCreateContent,
        canOrganizeContent:
          workspaceActive &&
          (workspace.permissions.canOrganizeContent ?? workspace.permissions.canCreateContent),
        canDeleteContent:
          workspaceActive && (workspace.permissions.canDeleteContent ?? false),
      }
    : {
        canCreateContent: false,
        canOrganizeContent: false,
        canDeleteContent: false,
      };

  const canCreate = treePermissions.canCreateContent;

  const { tree, state: treeState, reload } = useDocumentTree(workspaceId);

  useEffect(() => {
    if (!accessDenied || !workspaceId) return;
    if (workspaceStore.getById({ workspaceId })) {
      workspaceStore.remove({ workspaceId });
    }
    toast.error("You are not a member of this workspace.", {
      description: "Accept an invitation first, or open a workspace you belong to.",
    });
    navigate("/workspaces", { replace: true });
  }, [accessDenied, navigate, workspaceId]);

  // Compute richer stats from the tree for the hero strip.
  const stats = useMemo(() => {
    let folders = 0;
    let docs = 0;
    let approved = 0;
    let pending = 0;
    let drafts = 0;
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.type === "folder") {
          folders++;
          walk(n.children);
        } else {
          docs++;
          if (n.status === "approved") approved++;
          else if (n.status === "submitted" || n.status === "changes_requested") pending++;
          else if (n.status === "draft") drafts++;
        }
      }
    };
    walk(tree);
    return { folders, docs, approved, pending, drafts };
  }, [tree]);

  useEffect(() => {
    if (workspace?.name) {
      document.title = `Documents — ${workspace.name} — CollabSphere`;
    }
  }, [workspace?.name]);

  if (!paramWorkspaceId) {
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

  if (isError || !workspace || !myRole) {
    return (
      <div className="app-light dark:bg-stone-950 min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-stone-700 dark:text-stone-200 font-medium">
          {accessDenied ? "You do not have access to this workspace." : "Couldn’t load documents for this workspace."}
        </p>
        {!accessDenied && (
          <button
            type="button"
            onClick={() => refetch()}
            className="h-10 px-4 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-500"
          >
            Retry
          </button>
        )}
        <Link
          to="/workspaces"
          className="h-10 px-4 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 inline-flex items-center"
        >
          My workspaces
        </Link>
      </div>
    );
  }

  return (
    <div className="app-light dark:bg-stone-950 min-h-screen flex">
      <WorkspaceSidebar workspace={workspace} collapsed={collapsed} onToggle={toggle} />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopNav user={currentUser} onOpenPalette={palette.toggle} />

        <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 max-w-7xl mx-auto w-full">
          <PageHeader
            variant="contextual"
            eyebrow={workspace.name}
            title="Documents"
            description="Folders, drafts, and approved docs — organized in a tree you can rearrange."
            icon={<Folder className="h-5 w-5 text-stone-500" />}
            badges={
              treeState === "loaded" ? (
                <CountChip value={tree.length} label={`${tree.length} root nodes`} />
              ) : undefined
            }
            actions={
              canCreate ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const ev = new CustomEvent("documents:new-folder");
                      window.dispatchEvent(ev);
                    }}
                    className="h-9 px-3 rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-500 transition-all duration-150 flex items-center gap-1.5 shadow-sm"
                  >
                    <FolderPlus className="h-4 w-4 text-stone-500" />
                    <span className="hidden sm:inline">New folder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ev = new CustomEvent("documents:new-doc");
                      window.dispatchEvent(ev);
                    }}
                    className="h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-sm font-medium text-white transition-colors duration-150 flex items-center gap-1.5 shadow-sm"
                  >
                    <FilePlus className="h-4 w-4" />
                    <span className="hidden sm:inline">New document</span>
                  </button>
                </>
              ) : undefined
            }
            meta={
              <>
                <MetaStat icon={Folder} label="tree view" />
                <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-stone-400 dark:text-stone-500">
                  Drag to reorder · Right-click for actions
                </span>
              </>
            }
            className="mb-5 sm:mb-6"
          />

          {/* Stats hero — gives the page editorial weight + at-a-glance state.
              Uses solid bg-white + bg-teal-50 chip so dark-mode overrides catch
              every surface (gradient stops can't be remapped). */}
          {treeState === "loaded" && (
            <section
              aria-label="Document library overview"
              className="mb-5 sm:mb-6 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-5 sm:p-6 lg:p-7 overflow-hidden relative shadow-sm"
            >
              {/* Decorative ambient glow — pure tint so dark mode reads as teal halo */}
              <div
                aria-hidden
                className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-teal-100 dark:bg-teal-950/40 opacity-40 blur-3xl pointer-events-none"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-200 dark:via-teal-800 to-transparent pointer-events-none"
              />

              <div className="relative flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-cs-pulse"
                    />
                    <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-teal-700 dark:text-teal-400 font-semibold">
                      Library
                    </p>
                  </div>
                  <h2 className="text-[19px] sm:text-[22px] font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-2 leading-tight">
                    {stats.docs === 0
                      ? "Start your first document"
                      : `${stats.docs} document${stats.docs === 1 ? "" : "s"} across ${stats.folders} folder${stats.folders === 1 ? "" : "s"}`}
                  </h2>
                  <p className="text-[13px] sm:text-sm text-stone-500 dark:text-stone-400 mt-2 max-w-xl leading-relaxed">
                    Organize folders, draft and submit work, and track approvals — all
                    from one tree. Drag to reorder, right-click for actions.
                  </p>
                  {canCreate && stats.docs === 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("documents:new-doc"))}
                        className="h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <FilePlus className="h-3.5 w-3.5" />
                        Create first document
                      </button>
                      <Link
                        to={`/w/${workspace.id}/templates`}
                        className="h-9 px-3.5 rounded-lg border border-stone-200 bg-white text-stone-700 text-[13px] font-medium hover:bg-stone-50 hover:border-stone-300 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <LayoutTemplate className="h-3.5 w-3.5 text-stone-500" />
                        Browse templates
                      </Link>
                    </div>
                  )}
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 w-full lg:w-[440px] flex-shrink-0">
                  <DocStat
                    icon={<FileText className="h-3.5 w-3.5" />}
                    label="Documents"
                    value={stats.docs}
                    tone="stone"
                  />
                  <DocStat
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    label="Drafts"
                    value={stats.drafts}
                    tone="stone"
                  />
                  <DocStat
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="In review"
                    value={stats.pending}
                    tone="amber"
                  />
                  <DocStat
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    label="Approved"
                    value={stats.approved}
                    tone="emerald"
                  />
                </dl>
              </div>
            </section>
          )}
          {workspace.status === "archived" && (
            <div
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 mb-4"
            >
              <p className="text-sm font-semibold text-stone-900">
                This workspace is archived
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                All documents are read-only. New folders and documents cannot be created.
              </p>
            </div>
          )}

          {treeState === "loading" && (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          )}

          {treeState === "loaded" && (
            <DocumentTreeWithHeaderActions
              workspaceId={workspace.id}
              workspaceType={workspace.type}
              initialTree={tree}
              permissions={treePermissions}
              onServerTreeChange={() => reload()}
            />
          )}

          {treeState === "error" && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50/40 p-4 text-sm text-red-700">
              Couldn't load the document tree. Try refreshing the page.
            </div>
          )}
        </main>
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

// Tiny wrapper that listens to header-button custom events so the header can
// trigger root-level "new doc" / "new folder" without prop-drilling state up.
const DocumentTreeWithHeaderActions = ({
  workspaceId,
  workspaceType,
  initialTree,
  permissions,
  onServerTreeChange,
}: {
  workspaceId: string;
  workspaceType: "professional" | "academic" | "general";
  initialTree: TreeNode[];
  permissions: {
    canCreateContent: boolean;
    canOrganizeContent: boolean;
    canDeleteContent: boolean;
  };
  onServerTreeChange: () => void;
}) => {
  const [autoOpen, setAutoOpen] = useState<"doc" | "folder" | null>(null);

  useEffect(() => {
    const onDoc = () => setAutoOpen("doc");
    const onFolder = () => setAutoOpen("folder");
    window.addEventListener("documents:new-doc", onDoc);
    window.addEventListener("documents:new-folder", onFolder);
    return () => {
      window.removeEventListener("documents:new-doc", onDoc);
      window.removeEventListener("documents:new-folder", onFolder);
    };
  }, []);

  return (
    <WorkspaceDocumentTree
      key={workspaceId}
      variant="page"
      workspaceId={workspaceId}
      workspaceType={workspaceType}
      tree={initialTree}
      permissions={permissions}
      onServerTreeChange={onServerTreeChange}
      // expose imperative trigger via prop
      autoOpen={autoOpen}
      onAutoOpenHandled={() => setAutoOpen(null)}
    />
  );
};

/* ─────────── Local stat tile for the documents hero ─────────── */

const DocStat = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "stone" | "amber" | "emerald";
}) => {
  const valueCls =
    tone === "amber"
      ? "text-amber-700 dark:text-amber-400"
      : tone === "emerald"
        ? "text-emerald-700 dark:text-emerald-400"
        : "text-stone-900 dark:text-stone-100";
  const iconCls =
    tone === "amber"
      ? "text-amber-600 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800"
      : tone === "emerald"
        ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800"
        : "text-stone-500 bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-600";
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2.5 flex items-center gap-2.5">
      <span
        className={`h-7 w-7 rounded-md border flex items-center justify-center flex-shrink-0 ${iconCls}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-stone-500 dark:text-stone-400">
          {label}
        </div>
        <div className={`font-mono tabular-nums text-[16px] font-semibold leading-tight ${valueCls}`}>
          {value}
        </div>
      </div>
    </div>
  );
};

export default Documents;
