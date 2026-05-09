import { useEffect, useMemo, useState } from "react";
import { TaskPageHeader } from "./task-page-header";
import { TaskDetailSheet, type TaskRole } from "./task-detail-sheet";
import { CreateTaskDialog } from "./create-task-dialog";
import { useTaskListQueryState } from "../hooks/use-task-list-query-state";
import { useTaskRealtime } from "../hooks/use-task-realtime";
import {
  getAllLabels,
  getWorkspaceWorkflowColumns,
  listTasksMap,
  listWorkspaceMembers,
  type TaskAssignee,
  type TaskDetail,
} from "@/api/adapters/tasks";
import { TaskCard } from "./task-card";

interface TaskCalendarProps {
  workspaceId: string;
  workspaceStatus: "active" | "archived";
  myRole: TaskRole;
}

export const TaskCalendar = ({
  workspaceId,
  workspaceStatus,
  myRole,
}: TaskCalendarProps) => {
  const [tasksMap, setTasksMap] = useState<Record<string, TaskDetail>>({});
  const [members, setMembers] = useState<TaskAssignee[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [columns, setColumns] = useState(() => getWorkspaceWorkflowColumns(workspaceId));

  const { state, setSearch, setFilters } = useTaskListQueryState();

  const realtime = useTaskRealtime(workspaceId);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTasksMap(workspaceId), listWorkspaceMembers(workspaceId)])
      .then(([loadedTasks, loadedMembers]) => {
        if (cancelled) return;
        setTasksMap(loadedTasks);
        setMembers(loadedMembers);
      })
      .catch(() => {
        if (cancelled) return;
        setTasksMap({});
        setMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    setColumns(getWorkspaceWorkflowColumns(workspaceId));
  }, [workspaceId]);

  const allLabels = useMemo(() => getAllLabels(tasksMap), [tasksMap]);
  const tasks = Object.values(tasksMap);
  const isArchived = workspaceStatus === "archived";
  const canCreate = !isArchived && myRole !== "VIEWER";

  // MVP Calendar view: Just group tasks by their due date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, TaskDetail[]>();
    tasks.forEach((t) => {
      const dateKey = t.dueDate ? t.dueDate.split("T")[0] : "No Due Date";
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(t);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-6 pt-6 flex-shrink-0">
        <TaskPageHeader
          workspaceId={workspaceId}
          activeView="list"
          totalTaskCount={tasks.length}
          search={state.search}
          onSearchChange={setSearch}
          filters={state.filters}
          onFiltersChange={setFilters}
          members={members}
          allLabels={allLabels}
          canCreate={canCreate}
          onCreateTask={() => setIsCreateOpen(true)}
          realtime={realtime}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
        <div className="space-y-8">
          {groupedByDate.map(([date, dateTasks]) => (
            <div key={date}>
              <h3 className="font-mono text-[12px] tracking-wider uppercase text-stone-500 mb-4 pb-2 border-b border-stone-200">
                {date} <span className="text-stone-400 normal-case">({dateTasks.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {dateTasks.map(t => (
                  <TaskCard key={t.id} task={t} onClick={() => setActiveTaskId(t.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeTaskId && tasksMap[activeTaskId] && (
        <TaskDetailSheet
          workspaceId={workspaceId}
          task={tasksMap[activeTaskId]}
          isLoading={false}
          open={true}
          isArchived={isArchived}
          myRole={myRole}
          allTasks={tasksMap}
          currentUserId="user-jane"
          members={members}
          onClose={() => setActiveTaskId(null)}
          onDelete={(id) => {
            const next = { ...tasksMap };
            delete next[id];
            setTasksMap(next);
            setActiveTaskId(null);
          }}
          onUpdate={(id, patch) => {
            setTasksMap((prev) => ({
              ...prev,
              [id]: { ...prev[id], ...patch, updatedAt: new Date().toISOString() },
            }));
          }}
          onAddComment={() => {}}
          onEditComment={() => {}}
          onDeleteComment={() => {}}
          statusOptions={[
            ...columns.map((column) => ({ status: column.status, label: column.label })),
          ]}
        />
      )}

      {isCreateOpen && (
        <CreateTaskDialog
          workspaceId={workspaceId}
          presetStatus="todo"
          statusOptions={[
            { status: "todo", label: "To Do" },
            { status: "in_progress", label: "In Progress" },
            { status: "in_review", label: "Testing" },
            { status: "done", label: "Done" },
          ]}
          members={members}
          assignableMembers={members}
          currentUserId="user-jane"
          onClose={() => setIsCreateOpen(false)}
          onCreated={(task) => {
            const id = `task-${Date.now()}`;
            const assignee = task.assigneeId
              ? members.find((m) => m.id === task.assigneeId) ?? null
              : null;
            const now = new Date().toISOString();
            setTasksMap((prev) => ({
              ...prev,
              [id]: {
                id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                assignee,
                dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
                labels: task.labels ?? [],
                commentCount: 0,
                position: Object.keys(prev).length + 1,
                description: task.description ?? null,
                descriptionRich: task.description ? [{ type: "text", text: task.description }] : null,
                reporterId: "user-jane",
                reporterName: "Elshaday Tesfaye",
                createdAt: now,
                updatedAt: now,
                linkedResources: task.sourceLink ? [task.sourceLink] : [],
                comments: [],
                parentTaskId: null,
                subtaskIds: [],
                blockedByTaskIds: [],
                blockingTaskIds: [],
              },
            }));
            setIsCreateOpen(false);
          }}
        />
      )}
    </div>
  );
};
