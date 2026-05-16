import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { TopNav } from "@/app/shell/top-nav";
import { CommandPalette } from "@/app/shell/command-palette";
import { WorkspaceSidebar } from "@/features/workspace/components/workspace-sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useWorkspaceRouteContext } from "@/hooks/use-workspace-route-context";
import { useCurrentAccount } from "@/lib/auth-session";
import {
  canTransition,
  createTaskComment,
  deleteTaskComment,
  getWorkspaceWorkflowColumns,
  listTasksMap,
  listWorkspaceMembers,
  updateTaskComment,
  transitionReason,
  type TaskAssignee,
  type TaskDetail,
} from "@/api/adapters/tasks";
import type { CommentNode } from "@/lib/mock-comments";
import { TaskDetailSheet } from "@/features/tasks/components/task-detail-sheet";
import { resolveTaskParam, resolveWorkspaceParam } from "@/lib/route-params";
import { useTaskRealtime } from "@/features/tasks/hooks/use-task-realtime";

const TaskDetailPage = () => {
  const params = useParams();
  const workspaceId = resolveWorkspaceParam(params.workspaceId);
  const taskId = resolveTaskParam(params.taskId);
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebar();
  const palette = useCommandPalette();
  const account = useCurrentAccount();
  const { sidebar, myRole, isLoading: shellLoading, isError: shellError, refetch } =
    useWorkspaceRouteContext();

  const currentUserId = account?.id ?? "";
  const currentUser = account
    ? { fullName: account.fullName, email: account.email }
    : { fullName: "Guest", email: "" };

  const isArchived = sidebar?.status === "archived";

  const [tasks, setTasks] = useState<Record<string, TaskDetail>>({});
  const [members, setMembers] = useState<TaskAssignee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadTaskData = useCallback(async () => {
    setIsLoading(true);
    const [taskMap, loadedMembers] = await Promise.all([listTasksMap(workspaceId), listWorkspaceMembers(workspaceId)]);
    setTasks(taskMap);
    setMembers(loadedMembers);
    setIsLoading(false);
  }, [workspaceId]);
  useTaskRealtime(workspaceId, () => {
    void loadTaskData().catch(() => undefined);
  });

  useEffect(() => {
    if (shellLoading || shellError || !sidebar) return undefined;
    let cancelled = false;
    loadTaskData()
      .catch(() => {
        if (cancelled) return;
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadTaskData, shellLoading, shellError, sidebar]);

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

  if (shellLoading) {
    return (
      <div className="app-light min-h-screen flex items-center justify-center gap-2 text-stone-500 text-sm">
        Loading workspace…
      </div>
    );
  }

  if (shellError || !sidebar || !myRole) {
    return (
      <div className="app-light min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-stone-700 font-medium">Couldn’t load task workspace.</p>
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

  const handleDelete = (id: string) => {
    setTasks((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    navigate(`/w/${workspaceId}/tasks`);
  };

  const handleAddComment = async (id: string, body: CommentNode[]) => {
    await createTaskComment(workspaceId, id, body);
    await loadTaskData();
  };

  const handleEditComment = async (_id: string, commentId: string, body: CommentNode[]) => {
    await updateTaskComment(workspaceId, commentId, body);
    await loadTaskData();
  };

  const handleDeleteComment = async (_id: string, commentId: string) => {
    await deleteTaskComment(workspaceId, commentId);
    await loadTaskData();
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
      <WorkspaceSidebar workspace={sidebar} collapsed={collapsed} onToggle={toggle} />
      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <TopNav user={currentUser} onOpenPalette={palette.toggle} />
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
                myRole={myRole}
                currentUserId={currentUserId}
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
