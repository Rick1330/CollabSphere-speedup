import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import {
  WorkspaceSidebar,
  type WorkspaceForSidebar,
} from "@/features/workspace/components/workspace-sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import {
  canTransition,
  getWorkspaceWorkflowColumns,
  listTasksMap,
  listWorkspaceMembers,
  transitionReason,
  type TaskAssignee,
  type TaskComment,
  type TaskDetail,
} from "@/api/adapters/tasks";
import type { CommentNode } from "@/lib/mock-comments";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { resolveTaskParam, resolveWorkspaceParam } from "@/lib/route-params";

type Role = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
type WorkspaceWithRole = WorkspaceForSidebar & { myRole: Role };

const MOCK_USER = { fullName: "Elshaday Tesfaye", email: "jane@collabsphere.app" };
const CURRENT_USER_ID = "user-jane";

const WORKSPACES: Record<string, WorkspaceWithRole> = {
  alpha: {
    id: "alpha", name: "Project Alpha", description: "", icon: "📦",
    type: "professional", roleLabel: "TECH LEAD", status: "active", myRole: "ADMIN",
    permissions: { canCreateContent: true, canEditSettings: true, canViewAnalytics: true },
  },
  thesis: {
    id: "thesis", name: "Thesis", description: "", icon: "🎓",
    type: "academic", roleLabel: "STUDENT", status: "active", myRole: "MEMBER",
    permissions: { canCreateContent: true, canEditSettings: false, canViewAnalytics: false },
  },
  personal: {
    id: "personal", name: "Personal Notes", description: "", icon: "📝",
    type: "general", roleLabel: "OWNER", status: "active", myRole: "OWNER",
    permissions: { canCreateContent: true, canEditSettings: true, canViewAnalytics: false },
  },
  research: {
    id: "research", name: "Research Group", description: "", icon: "🔬",
    type: "academic", roleLabel: "REVIEWER", status: "archived", myRole: "MEMBER",
    permissions: { canCreateContent: false, canEditSettings: true, canViewAnalytics: false },
  },
};

const TaskDetailPage = () => {
  const params = useParams();
  const workspaceId = resolveWorkspaceParam(params.workspaceId);
  const taskId = resolveTaskParam(params.taskId);
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();

  const workspace = WORKSPACES[workspaceId] ?? { ...WORKSPACES.alpha, id: workspaceId };
  const isArchived = workspace.status === "archived";

  const [tasks, setTasks] = useState<Record<string, TaskDetail>>({});
  const [members, setMembers] = useState<TaskAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([listTasksMap(workspaceId), listWorkspaceMembers(workspaceId)])
      .then(([taskMap, loadedMembers]) => {
        if (cancelled) return;
        setTasks(taskMap);
        setMembers(loadedMembers);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const task = tasks[taskId] ?? null;
  const columns = useMemo(() => getWorkspaceWorkflowColumns(workspaceId), [workspaceId]);

  useEffect(() => {
    document.title = task?.title ? `${task.title} — Task — CollabSphere` : "Task — CollabSphere";
  }, [task?.title]);

  const handleUpdate = (id: string, patch: Partial<TaskDetail>) => {
    setTasks((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      if (patch.status && !canTransition(cur.status, patch.status)) {
        toast.error("Move not allowed", {
          description: transitionReason(cur.status, patch.status),
        });
        return prev;
      }
      return {
        ...prev,
        [id]: { ...cur, ...patch, updatedAt: new Date().toISOString() },
      };
    });
  };

  const handleDelete = (id: string) => {
    setTasks((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    navigate(`/w/${workspaceId}/tasks`);
  };

  const handleAddComment = (id: string, body: CommentNode[]) => {
    setTasks((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      const c: TaskComment = {
        id: `tc-${Date.now()}`,
        authorId: CURRENT_USER_ID,
        body,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [id]: {
          ...cur,
          comments: [...cur.comments, c],
          commentCount: cur.comments.length + 1,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleEditComment = (id: string, commentId: string, body: CommentNode[]) => {
    setTasks((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          comments: cur.comments.map((c) =>
            c.id === commentId ? { ...c, body, updatedAt: new Date().toISOString() } : c,
          ),
        },
      };
    });
  };

  const handleDeleteComment = (id: string, commentId: string) => {
    setTasks((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          comments: cur.comments.filter((c) => c.id !== commentId),
          commentCount: Math.max(0, (cur.commentCount || cur.comments.length) - 1),
        },
      };
    });
  };

  const handleUnlinkResource = (id: string, resourceId: string) => {
    setTasks((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      return {
        ...prev,
        [id]: {
          ...cur,
          linkedResources: cur.linkedResources.filter((r) => r.id !== resourceId),
        },
      };
    });
  };

  return (
    <div className="app-light min-h-screen flex bg-stone-50">
      <WorkspaceSidebar workspace={workspace} collapsed={collapsed} onToggle={toggle} />
      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <TopNav user={MOCK_USER} unreadCount={3} onOpenPalette={palette.toggle} />
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="border-b border-stone-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
              <Link
                to={`/w/${workspaceId}/tasks`}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-500 hover:text-stone-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to board
              </Link>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
              <TaskDetailSheet
                workspaceId={workspaceId}
                open
                mode="page"
                task={task}
                isLoading={isLoading}
                isArchived={isArchived}
                myRole={workspace.myRole}
                currentUserId={CURRENT_USER_ID}
                members={members}
                onClose={() => navigate(`/w/${workspaceId}/tasks`)}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onAddComment={handleAddComment}
                onEditComment={handleEditComment}
                onDeleteComment={handleDeleteComment}
                onUnlinkResource={handleUnlinkResource}
                allTasks={tasks}
                statusOptions={columns.map((c) => ({ status: c.status, label: c.label }))}
              />
            </div>
          </div>
        </main>
      </div>

      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </div>
  );
};

export default TaskDetailPage;
