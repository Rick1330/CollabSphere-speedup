import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskBoardItem, TaskStatus } from "@/api/adapters/tasks";
import { TaskCard } from "./task-card";

/**
 * Column identity is the single biggest reason a kanban board feels
 * "designed" instead of "generated." Each status gets:
 *   - a top accent rail (color-coded, matches the status semantics)
 *   - a tinted header background (subtle, not noisy)
 *   - a status dot + label + count rhythm
 * Done columns recede slightly so attention sits on active work.
 */
const TONE_IDENTITY = {
  stone: {
    rail: "bg-stone-500",
    headerBg: "bg-stone-100",
    dot: "bg-stone-600",
    label: "text-stone-800",
    body: "bg-white",
  },
  teal: {
    rail: "bg-teal-500",
    headerBg: "bg-teal-50/80",
    dot: "bg-teal-500",
    label: "text-teal-800",
    body: "bg-teal-50/20",
  },
  amber: {
    rail: "bg-amber-500",
    headerBg: "bg-amber-50/80",
    dot: "bg-amber-500",
    label: "text-amber-800",
    body: "bg-amber-50/20",
  },
  emerald: {
    rail: "bg-emerald-500",
    headerBg: "bg-emerald-50/60",
    dot: "bg-emerald-500",
    label: "text-emerald-800",
    body: "bg-emerald-50/10",
  },
  rose: {
    rail: "bg-rose-500",
    headerBg: "bg-rose-50/70",
    dot: "bg-rose-500",
    label: "text-rose-800",
    body: "bg-rose-50/20",
  },
  indigo: {
    rail: "bg-indigo-500",
    headerBg: "bg-indigo-50/70",
    dot: "bg-indigo-500",
    label: "text-indigo-800",
    body: "bg-indigo-50/20",
  },
  violet: {
    rail: "bg-violet-500",
    headerBg: "bg-violet-50/70",
    dot: "bg-violet-500",
    label: "text-violet-800",
    body: "bg-violet-50/20",
  },
  sky: {
    rail: "bg-sky-500",
    headerBg: "bg-sky-50/70",
    dot: "bg-sky-500",
    label: "text-sky-800",
    body: "bg-sky-50/20",
  },
} as const;

interface TaskColumnProps {
  status: TaskStatus;
  label: string;
  tasks: TaskBoardItem[];
  tone?: keyof typeof TONE_IDENTITY;
  canCreate: boolean;
  onTaskClick: (taskId: string) => void;
  onAddTask: (status: TaskStatus) => void;
}

export const TaskColumn = ({
  status,
  label,
  tasks,
  tone = "stone",
  canCreate,
  onTaskClick,
  onAddTask,
}: TaskColumnProps) => {
  const identity = TONE_IDENTITY[tone] ?? TONE_IDENTITY.stone;
  return (
    <section
      role="region"
      aria-label={`${label} — ${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
      className={cn(
        "flex flex-col min-w-[272px] max-w-[300px] w-full rounded-xl border border-stone-200/70 self-start overflow-hidden shadow-sm",
        identity.body,
      )}
    >
      {/* Top accent rail — gives every column a unique stripe of identity */}
      <div className={cn("h-[3px] w-full", identity.rail)} aria-hidden="true" />

      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 border-b border-stone-200/50",
          identity.headerBg,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full flex-shrink-0",
              identity.dot,
            )}
            aria-hidden="true"
          />
          <span
            className={cn(
              "font-mono text-[10px] tracking-[0.18em] uppercase truncate",
              identity.label,
            )}
          >
            {label}
          </span>
          <span className="font-mono text-[10px] text-stone-400 tracking-wider tabular-nums ml-0.5">
            {String(tasks.length).padStart(2, "0")}
          </span>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => onAddTask(status)}
            className="h-6 w-6 rounded-md flex items-center justify-center text-stone-400 hover:text-teal-600 hover:bg-white/80 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
            aria-label={`Add task to ${label}`}
            title={`Add task to ${label}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 min-h-[100px] max-h-[calc(100vh-260px)]">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center px-3">
            <span className="font-mono text-[10px] text-stone-300 tracking-[0.18em] uppercase">
              Empty
            </span>
            {canCreate && (
              <button
                type="button"
                onClick={() => onAddTask(status)}
                className="mt-2 text-[11px] text-stone-400 hover:text-teal-600 transition-colors focus-visible:outline-none focus-visible:underline"
              >
                + Add a task
              </button>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
            />
          ))
        )}
      </div>

      {/* Footer add task button */}
      {canCreate && tasks.length > 0 && (
        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={() => onAddTask(status)}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-dashed border-stone-300 text-[11px] text-stone-400 hover:text-teal-600 hover:border-teal-300 hover:bg-white transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
          >
            <Plus className="h-3 w-3" />
            Add task
          </button>
        </div>
      )}
    </section>
  );
};
