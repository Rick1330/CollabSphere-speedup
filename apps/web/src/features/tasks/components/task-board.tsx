import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Archive,
  KanbanSquare,
  Settings2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useHotkey } from "@/hooks/use-hotkey";
import type { CommentNode } from "@/lib/mock-comments";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildBoardData,
  canTransition,
  getStatusLabel,
  getWorkspaceWorkflowColumns,
  getAllLabels,
  listWorkspaceMembers,
  setWorkspaceWorkflowColumns,
  transitionReason,
  type TaskAssignee,
  type TaskBoardColumn,
  type TaskComment,
  type TaskDetail,
  type TaskLinkedResource,
  type TaskPriority,
  type TaskStatus,
} from "@/api/adapters/tasks";
import { TaskPageHeader } from "./task-page-header";
import { TaskColumn } from "./task-column";
import { CreateTaskDialog, type SourceDocumentLink } from "./create-task-dialog";
import { TaskDetailSheet, type TaskRole } from "./task-detail-sheet";
import {
  EMPTY_FILTERS,
  type AdvancedFilterState,
} from "./task-advanced-filters";
import { subscribeRealtimeStatus } from "@/api/realtime/socket-client";
import { useCurrentAccount } from "@/lib/auth-session";
import {
  updateTasksBoardCache,
  useTasksBoardQuery,
} from "@/features/tasks/hooks/use-tasks-board-query";
import type { RealtimeStatus } from "@/features/tasks/hooks/use-task-realtime";

interface TaskBoardProps {
  workspaceId: string;
  workspaceName: string;
  workspaceStatus: "active" | "archived";
  myRole: TaskRole;
}

const BoardSkeleton = () => (
  <div className="flex gap-4 px-4 py-4 overflow-x-auto h-full">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="min-w-[272px] max-w-[300px] w-full rounded-xl bg-stone-50/70 border border-stone-200/60 flex flex-col self-start"
      >
        <div className="px-3 py-2.5 border-b border-stone-200/40 flex items-center gap-2">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <Skeleton className="h-3 w-4 rounded" />
        </div>
        <div className="px-2 py-2 space-y-2 flex-1">
          {Array.from({ length: Math.max(3 - i, 1) }).map((_, j) => (
            <div
              key={j}
              className="rounded-lg border border-stone-200 bg-white p-3 space-y-2"
            >
              <Skeleton className="h-4 w-4/5 rounded" />
              <div className="flex gap-1.5">
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-10 rounded" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const TaskBoard = ({
  workspaceId,
  workspaceStatus,
  myRole,
}: TaskBoardProps) => {
  const account = useCurrentAccount();
  const currentUserId = account?.id ?? "";
  const queryClient = useQueryClient();
  const tasksQuery = useTasksBoardQuery(workspaceId);
  const tasks = tasksQuery.data ?? {};
  const [members, setMembers] = useState<TaskAssignee[]>([]);
  const [realtime, setRealtime] = useState<RealtimeStatus>("reconnecting");
  const isLoading = tasksQuery.isLoading;
  const isError = tasksQuery.isError;
  const navigate = useNavigate();

  const patchTasks = useCallback(
    (updater: (prev: Record<string, TaskDetail>) => Record<string, TaskDetail>) => {
      updateTasksBoardCache(queryClient, workspaceId, updater);
    },
    [queryClient, workspaceId],
  );

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeRealtimeStatus((status) => {
      if (!cancelled) setRealtime(status);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listWorkspaceMembers(workspaceId)
      .then((m) => {
        if (!cancelled) setMembers(m);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AdvancedFilterState>(EMPTY_FILTERS);
  const [createDialogStatus, setCreateDialogStatus] = useState<TaskStatus | null>(
    null,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [columns, setColumns] = useState(() => getWorkspaceWorkflowColumns(workspaceId));
  const [columnEditorOpen, setColumnEditorOpen] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");

  useEffect(() => {
    if (!selectedTaskId) return;
    setSheetLoading(true);
    const t = globalThis.setTimeout(() => setSheetLoading(false), 180);
    return () => globalThis.clearTimeout(t);
  }, [selectedTaskId]);

  useEffect(() => {
    setColumns(getWorkspaceWorkflowColumns(workspaceId));
  }, [workspaceId]);

  const isArchived = workspaceStatus === "archived";
  const canCreate =
    !isArchived && ["OWNER", "ADMIN", "MANAGER", "MEMBER"].includes(myRole);

  const allLabels = useMemo(() => getAllLabels(tasks), [tasks]);

  const boardColumns: TaskBoardColumn[] = useMemo(
    () => buildBoardData(tasks, columns),
    [tasks, columns],
  );

  const filteredColumns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return boardColumns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((task) => {
        if (q && !task.title.toLowerCase().includes(q)) return false;
        if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority))
          return false;
        if (filters.statuses.length > 0 && !filters.statuses.includes(task.status))
          return false;
        if (filters.assignees.length > 0) {
          const wantUnassigned = filters.assignees.includes("__unassigned");
          if (task.assignee) {
            if (!filters.assignees.includes(task.assignee.id)) return false;
          } else if (!wantUnassigned) {
            return false;
          }
        }
        if (filters.labels.length > 0) {
          if (!task.labels.some((l) => filters.labels.includes(l))) return false;
        }
        if (filters.dueAfter) {
          if (!task.dueDate) return false;
          if (new Date(task.dueDate) < new Date(filters.dueAfter)) return false;
        }
        if (filters.dueBefore) {
          if (!task.dueDate) return false;
          if (new Date(task.dueDate) > new Date(filters.dueBefore)) return false;
        }
        return true;
      }),
    }));
  }, [boardColumns, search, filters]);

  const totalTaskCount = boardColumns.reduce((s, c) => s + c.tasks.length, 0);
  const visibleTaskCount = filteredColumns.reduce((s, c) => s + c.tasks.length, 0);
  const isFiltered =
    search.trim().length > 0 ||
    filters.statuses.length +
      filters.assignees.length +
      filters.priorities.length +
      filters.labels.length +
      (filters.dueAfter ? 1 : 0) +
      (filters.dueBefore ? 1 : 0) >
      0;

  const selectedTask = selectedTaskId ? (tasks[selectedTaskId] ?? null) : null;

  // Context shortcuts — only fire on the board page, never inside inputs.
  useHotkey("/", () => {
    const el = document.querySelector<HTMLInputElement>('input[aria-label="Search tasks"]');
    el?.focus();
    el?.select();
  });
  useHotkey("n", () => {
    if (canCreate && !createDialogStatus) {
      setCreateDialogStatus(columns[0]?.status ?? "todo");
    }
  });
  useHotkey("v b", () => navigate(`/w/${workspaceId}/tasks`));
  useHotkey("v l", () => navigate(`/w/${workspaceId}/tasks/list`));

  // Mutations
  const handleCreate = (newTask: TaskDetail, sourceLink?: TaskLinkedResource) => {
    const taskWithLink: TaskDetail = sourceLink
      ? { ...newTask, linkedResources: [sourceLink, ...newTask.linkedResources] }
      : newTask;
    patchTasks((prev) => ({ ...prev, [taskWithLink.id]: taskWithLink }));
    setCreateDialogStatus(null);
    toast.success("Task created", {
      description: `"${taskWithLink.title}" added to ${getStatusLabel(taskWithLink.status, columns)}.`,
    });
  };

  const handleDelete = (taskId: string) => {
    patchTasks((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setSelectedTaskId(null);
    toast.success("Task deleted");
  };

  const handleUpdate = (taskId: string, patch: Partial<TaskDetail>) => {
    patchTasks((prev) => {
      const cur = prev[taskId];
      if (!cur) return prev;
      // Enforce status transition rules at the data layer too
      if (patch.status && !canTransition(cur.status, patch.status)) {
        toast.error("Move not allowed", {
          description: transitionReason(cur.status, patch.status),
        });
        return prev;
      }
      return {
        ...prev,
        [taskId]: { ...cur, ...patch, updatedAt: new Date().toISOString() },
      };
    });
  };

  const handleAddComment = (taskId: string, body: CommentNode[]) => {
    patchTasks((prev) => {
      const cur = prev[taskId];
      if (!cur) return prev;
      const c: TaskComment = {
        id: `tc-${Date.now()}`,
        authorId: currentUserId,
        body,
        createdAt: new Date().toISOString(),
      };
      const mention = body.find((n) => n.type === "mention");
      if (mention && mention.type === "mention") {
        toast.success(`${mention.display} will be notified`);
      }
      return {
        ...prev,
        [taskId]: {
          ...cur,
          comments: [...cur.comments, c],
          commentCount: cur.comments.length + 1,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleEditComment = (
    taskId: string,
    commentId: string,
    body: CommentNode[],
  ) => {
    patchTasks((prev) => {
      const cur = prev[taskId];
      if (!cur) return prev;
      return {
        ...prev,
        [taskId]: {
          ...cur,
          comments: cur.comments.map((c) =>
            c.id === commentId
              ? { ...c, body, updatedAt: new Date().toISOString() }
              : c,
          ),
        },
      };
    });
  };

  const handleDeleteComment = (taskId: string, commentId: string) => {
    patchTasks((prev) => {
      const cur = prev[taskId];
      if (!cur) return prev;
      return {
        ...prev,
        [taskId]: {
          ...cur,
          comments: cur.comments.filter((c) => c.id !== commentId),
          commentCount: Math.max(0, (cur.commentCount || cur.comments.length) - 1),
        },
      };
    });
  };

  const handleUnlinkResource = (taskId: string, resourceId: string) => {
    patchTasks((prev) => {
      const cur = prev[taskId];
      if (!cur) return prev;
      return {
        ...prev,
        [taskId]: {
          ...cur,
          linkedResources: cur.linkedResources.filter((r) => r.id !== resourceId),
        },
      };
    });
  };

  const refetch = () => {
    void tasksQuery.refetch();
  };

  const sourceLink: SourceDocumentLink | null = null;

  const handleUpdateColumnLabel = (status: TaskStatus, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setColumns((prev) => {
      const next = prev.map((c) => (c.status === status ? { ...c, label: trimmed } : c));
      setWorkspaceWorkflowColumns(workspaceId, next);
      return next;
    });
  };

  const handleRemoveColumn = (status: TaskStatus) => {
    setColumns((prev) => {
      if (prev.length <= 2) return prev;
      const fallback = prev[0]?.status ?? "todo";
      patchTasks((taskState) => {
        const nextTasks = { ...taskState };
        for (const task of Object.values(nextTasks)) {
          if (task.status === status) task.status = fallback;
        }
        return nextTasks;
      });
      const next = prev.filter((c) => c.status !== status);
      setWorkspaceWorkflowColumns(workspaceId, next);
      return next;
    });
  };

  const handleAddColumn = () => {
    const trimmed = newColumnLabel.trim();
    if (!trimmed) return;
    const slug = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!slug) return;
    setColumns((prev) => {
      if (prev.some((c) => c.status === slug)) return prev;
      const next = [...prev, { status: slug, label: trimmed, tone: "violet" as const }];
      setWorkspaceWorkflowColumns(workspaceId, next);
      return next;
    });
    setNewColumnLabel("");
  };

  return (
    <div className="flex flex-col h-full min-h-0" aria-busy={isLoading}>
      {isArchived && (
        <output
          className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex items-start sm:items-center justify-between gap-4 mx-4 mt-4 mb-2"
        >
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
              <Archive className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">
                This workspace is archived
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Tasks are read-only. No new tasks can be created.
              </p>
            </div>
          </div>
        </output>
      )}

      {realtime === "unavailable" && (
        <output
          className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 mx-4 mt-3 text-[12px] text-stone-600 flex items-center justify-between gap-3"
        >
          <span>
            Live updates unavailable. The board is polling every 15 seconds.
          </span>
          <button
            type="button"
            onClick={refetch}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Refresh
          </button>
        </output>
      )}

      <div className="px-4 sm:px-6 pt-4">
        <TaskPageHeader
          workspaceId={workspaceId}
          activeView="board"
          totalTaskCount={isLoading ? undefined : totalTaskCount}
          visibleTaskCount={isFiltered ? visibleTaskCount : undefined}
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          members={members}
          allLabels={allLabels}
          canCreate={canCreate}
          onCreateTask={() => setCreateDialogStatus(columns[0]?.status ?? "todo")}
          realtime={realtime}
          statusOptions={columns.map((c) => ({ status: c.status, label: c.label }))}
          statusActions={
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnEditorOpen((v) => !v)}
                className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-[12px] font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 dark:border-teal-900/70 dark:bg-teal-950/30 dark:text-teal-100 dark:hover:bg-teal-900/35 dark:hover:text-teal-50 transition-colors inline-flex items-center gap-1.5"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Columns
              </button>
              {columnEditorOpen && (
                <div className="absolute right-0 z-20 mt-1.5 w-80 rounded-lg border border-stone-200 bg-white p-3 shadow-xl dark:border-teal-900/70 dark:bg-stone-950">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-teal-200/85 mb-2">
                    Workflow columns
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {columns.map((col) => (
                      <div key={col.status} className="flex items-center gap-1.5">
                        <input
                          value={col.label}
                          onChange={(e) => handleUpdateColumnLabel(col.status, e.target.value)}
                          className="h-8 w-full rounded-md border border-stone-200 px-2 text-[12px] text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveColumn(col.status)}
                          className="h-8 w-8 rounded-md border border-stone-200 text-stone-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-rose-950/30 dark:hover:border-rose-900"
                          title={`Remove ${col.label}`}
                        >
                          <X className="h-3.5 w-3.5 mx-auto" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <input
                      value={newColumnLabel}
                      onChange={(e) => setNewColumnLabel(e.target.value)}
                      placeholder="New column label"
                      className="h-8 w-full rounded-md border border-stone-200 px-2 text-[12px] text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:placeholder:text-stone-500 focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="h-8 px-2 rounded-md bg-teal-600 text-white text-[11px] font-medium hover:bg-teal-500 dark:bg-emerald-700 dark:hover:bg-emerald-600"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          }
        />
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {isLoading && <BoardSkeleton />}

        {isError && !isLoading && (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-sm" role="alert">
              <div className="h-12 w-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm font-semibold text-stone-900 mt-4">
                Couldn't load tasks
              </p>
              <button
                type="button"
                onClick={refetch}
                className="mt-4 h-8 px-4 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-1.5 mx-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          </div>
        )}

        {!isLoading && !isError && totalTaskCount === 0 && (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center max-w-sm">
              <div className="h-12 w-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto">
                <KanbanSquare className="h-6 w-6 text-stone-400" />
              </div>
              <h3 className="text-sm font-semibold text-stone-900 mt-4">
                No tasks yet
              </h3>
              <p className="text-sm text-stone-500 mt-1.5">
                {canCreate
                  ? "Create your first task to start tracking your team's work."
                  : "No tasks have been created in this workspace yet."}
              </p>
              {canCreate && (
                <button
                  type="button"
                  onClick={() => setCreateDialogStatus("todo")}
                  className="mt-5 h-9 px-5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors flex items-center gap-2 mx-auto shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  New task
                </button>
              )}
            </div>
          </div>
        )}

        {!isLoading &&
          !isError &&
          totalTaskCount > 0 &&
          visibleTaskCount === 0 && (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center max-w-sm">
                <div className="h-12 w-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto">
                  <KanbanSquare className="h-6 w-6 text-stone-400" />
                </div>
                <h3 className="text-sm font-semibold text-stone-900 mt-4">
                  No tasks match these filters
                </h3>
                <p className="text-sm text-stone-500 mt-1.5">
                  Try removing a filter to see more results.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilters(EMPTY_FILTERS);
                  }}
                  className="mt-5 h-9 px-4 rounded-lg border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors mx-auto"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}

        {!isLoading && !isError && totalTaskCount > 0 && visibleTaskCount > 0 && (
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 px-4 sm:px-6 py-4 min-w-max h-full items-start">
              {filteredColumns.map((column) => (
                <TaskColumn
                  key={column.status}
                  status={column.status}
                  label={column.label}
                  tasks={column.tasks}
                  tone={columns.find((c) => c.status === column.status)?.tone}
                  canCreate={canCreate}
                  onTaskClick={(taskId) => setSelectedTaskId(taskId)}
                  onAddTask={(status) => setCreateDialogStatus(status)}
                />
              ))}
            </div>
          </div>
        )}

        {!isLoading && !isError && totalTaskCount > 0 && (
          <div className="md:hidden px-4 pb-4">
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-stone-500">
                List view is recommended on mobile.
              </span>
              <Link
                to={`/w/${workspaceId}/tasks/list`}
                className="text-[11px] font-medium text-teal-600 hover:text-teal-700 flex-shrink-0"
              >
                Switch to list →
              </Link>
            </div>
          </div>
        )}
      </div>

      {createDialogStatus && (
        <CreateTaskDialog
          workspaceId={workspaceId}
          presetStatus={createDialogStatus}
          statusOptions={columns.map((c) => ({ status: c.status, label: c.label }))}
          members={members}
          assignableMembers={
            ["OWNER", "ADMIN", "MANAGER"].includes(myRole)
              ? members
              : members.filter((m) => m.id === currentUserId)
          }
          currentUserId={currentUserId}
          sourceLink={sourceLink}
          onClose={() => setCreateDialogStatus(null)}
          onCreated={handleCreate}
        />
      )}

      <TaskDetailSheet
        workspaceId={workspaceId}
        open={!!selectedTaskId}
        task={selectedTask}
        isLoading={sheetLoading}
        isArchived={isArchived}
        myRole={myRole}
        currentUserId={currentUserId}
        members={members}
        onClose={() => setSelectedTaskId(null)}
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
  );
};
