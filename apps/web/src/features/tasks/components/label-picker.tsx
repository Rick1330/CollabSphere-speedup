import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  createWorkspaceLabel,
  getLabelClasses,
  getLabelName,
  listWorkspaceLabels,
} from "@/api/adapters/labels";

interface LabelPickerProps {
  workspaceId: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestedLabels?: string[];
  /** Optional compact display when no labels are selected. */
  emptyLabel?: string;
  /** Disable the picker (read-only contexts). */
  disabled?: boolean;
}

/**
 * Compact label chip strip + popover picker for tasks. Reads the workspace
 * vocabulary so labels feel like a curated system instead of free text.
 */
export const LabelPicker = ({
  workspaceId,
  value,
  onChange,
  suggestedLabels = [],
  emptyLabel = "Add labels",
  disabled = false,
}: LabelPickerProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const labelsQuery = useQuery({
    queryKey: ["workspace", workspaceId, "task-labels"],
    queryFn: () => listWorkspaceLabels(workspaceId),
    staleTime: 60_000,
  });
  const all = useMemo(() => {
    const apiLabels = labelsQuery.data ?? [];
    if (apiLabels.length > 0) {
      return apiLabels;
    }
    const fallback = new Set([...suggestedLabels, ...value]);
    return Array.from(fallback)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
      .map((slug) => ({
        value: slug,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
        tone: "stone" as const,
        description: null,
      }));
  }, [labelsQuery.data, suggestedLabels, value]);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? all.filter((l) => l.name.toLowerCase().includes(q) || l.value.includes(q))
    : all;
  const canCreateLabel =
    q.length > 1 &&
    !all.some(
      (l) =>
        l.name.toLowerCase() === q || l.value.toLowerCase() === q,
    );

  const toggle = (slug: string) => {
    if (value.includes(slug)) {
      onChange(value.filter((v) => v !== slug));
    } else {
      onChange([...value, slug]);
    }
  };

  const visible = value.slice(0, 4);
  const overflow = value.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((slug) => (
        <span
          key={slug}
          className={cn(
            "group inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border tabular-nums",
            getLabelClasses(workspaceId, slug),
          )}
        >
          {getLabelName(workspaceId, slug)}
          {!disabled && (
            <button
              type="button"
              onClick={() => toggle(slug)}
              aria-label={`Remove ${getLabelName(workspaceId, slug)}`}
              className="opacity-50 hover:opacity-100 -mr-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-[11px] font-mono text-stone-500 px-1.5 py-0.5 rounded-full bg-stone-100 border border-stone-200">
          +{overflow}
        </span>
      )}

      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-6 px-2 rounded-full border border-dashed border-stone-300 text-[11px] font-medium text-stone-500 hover:text-stone-800 hover:border-stone-400 hover:bg-stone-50 inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              {value.length === 0 ? emptyLabel : "Edit"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-0">
            <div className="px-3 pt-3 pb-2 border-b border-stone-100">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search labels…"
                autoFocus
                className="w-full h-8 px-2 rounded-md border border-stone-200 text-[12px] focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/20 focus:outline-none"
              />
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {canCreateLabel && (
                <li>
                  <button
                    type="button"
                    onClick={async () => {
                      const created = await createWorkspaceLabel(workspaceId, query.trim());
                      if (!created) return;
                      void queryClient.invalidateQueries({
                        queryKey: ["workspace", workspaceId, "task-labels"],
                      });
                      if (!value.includes(created.value)) {
                        onChange([...value, created.value]);
                      }
                      setQuery("");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-stone-50 border-b border-stone-100"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                      <Plus className="h-3 w-3" />
                    </span>
                    <span className="text-stone-700">
                      Create label: <strong>{query.trim()}</strong>
                    </span>
                  </button>
                </li>
              )}
              {labelsQuery.isError && (
                <li className="px-3 py-3 text-[12px] text-rose-500 text-center">
                  Could not load workspace labels.
                </li>
              )}
              {filtered.length === 0 && !labelsQuery.isError && (
                <li className="px-3 py-4 text-[12px] text-stone-400 italic text-center">
                  No labels found.
                </li>
              )}
              {filtered.map((l) => {
                const active = value.includes(l.value);
                return (
                  <li key={l.value}>
                    <button
                      type="button"
                      onClick={() => toggle(l.value)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12.5px] hover:bg-stone-50",
                        active && "bg-stone-50/60",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded-full border",
                          getLabelClasses(workspaceId, l.value),
                        )}
                      >
                        {l.name}
                      </span>
                      {l.description && (
                        <span className="text-[11px] text-stone-400 truncate">
                          {l.description}
                        </span>
                      )}
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 ml-auto text-teal-600 flex-shrink-0",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="px-3 py-2 border-t border-stone-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-stone-400">
                {value.length} selected
              </span>
              {value.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="text-[11px] font-medium text-stone-500 hover:text-stone-800"
                >
                  Clear all
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
