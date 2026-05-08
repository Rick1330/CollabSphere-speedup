import { useState, useMemo } from "react";
import { TaskPageHeader } from "./task-page-header";
import { TaskDetailSheet, type TaskRole } from "./task-detail-sheet";
import { CreateTaskDialog } from "./create-task-dialog";
import { useTaskListQueryState } from "../hooks/use-task-list-query-state";
import { useTaskRealtime } from "../hooks/use-task-realtime";
import { SEED_TASKS, SEED_WORKSPACE_MEMBERS, getAllLabels, type TaskDetail } from "@/api/adapters/tasks";
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
  const [tasksMap, setTasksMap] = useState<Record<string, TaskDetail>>(SEED_TASKS);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const {
    search,
    setSearch,
    filters,
    setFilters,
  } = useTaskListQueryState();

  const realtime = useTaskRealtime(workspaceId);

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
          activeView="calendar"
          totalTaskCount={tasks.length}
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
          members={SEED_WORKSPACE_MEMBERS}
          allLabels={allLabels}
          canCreate={canCreate}
          onCreateTask={() => setIsCreateOpen(true)}
          realtime={realtime.status}
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
          currentUserId="user-jane"
          members={SEED_WORKSPACE_MEMBERS}
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
        />
      )}

      {isCreateOpen && (
        <CreateTaskDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          workspaceId={workspaceId}
          members={SEED_WORKSPACE_MEMBERS}
          allLabels={allLabels}
          defaultAssigneeId="user-jane"
          onSubmit={(task) => {
            setTasksMap((prev) => ({ ...prev, [task.id]: task as any }));
            setIsCreateOpen(false);
          }}
        />
      )}
    </div>
  );
};
