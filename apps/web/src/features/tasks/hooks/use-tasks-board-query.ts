import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasksMap } from "@/api/adapters/tasks";
import type { TaskDetail } from "@/features/tasks/mocks/tasks";
import { queryKeys } from "@/lib/query-keys";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";

export function useTasksBoardQuery(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.board(workspaceId),
    queryFn: () => listTasksMap(workspaceId),
    enabled: Boolean(workspaceId) && isDatabaseWorkspaceId(workspaceId),
  });
}

export function updateTasksBoardCache(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  updater: (prev: Record<string, TaskDetail>) => Record<string, TaskDetail>,
): void {
  queryClient.setQueryData<Record<string, TaskDetail>>(
    queryKeys.tasks.board(workspaceId),
    (prev) => {
      if (!prev) return prev;
      return updater(prev);
    },
  );
}
