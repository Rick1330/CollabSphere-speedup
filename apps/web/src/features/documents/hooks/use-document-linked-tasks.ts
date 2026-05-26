import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listTasksMap } from "@/api/adapters/tasks";
import type { TaskDetail, TaskLinkedResource } from "@/features/tasks/mocks/tasks";
import { queryKeys } from "@/lib/query-keys";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";

export type DocumentLinkedTaskEntry = {
  task: TaskDetail;
  link: TaskLinkedResource;
};

function mergeLinkedTasks(
  apiTasks: Record<string, TaskDetail>,
  documentId: string,
  sessionEntries: DocumentLinkedTaskEntry[],
): DocumentLinkedTaskEntry[] {
  const byTaskId = new Map<string, DocumentLinkedTaskEntry>();

  for (const task of Object.values(apiTasks)) {
    for (const link of task.linkedResources) {
      if (link.documentId !== documentId) continue;
      byTaskId.set(task.id, { task, link });
    }
  }

  for (const entry of sessionEntries) {
    if (entry.link.documentId !== documentId) continue;
    byTaskId.set(entry.task.id, entry);
  }

  return Array.from(byTaskId.values()).sort((a, b) => {
    const aDone = a.task.status === "done";
    const bDone = b.task.status === "done";
    if (aDone !== bDone) return aDone ? 1 : -1;
    return new Date(b.task.updatedAt).getTime() - new Date(a.task.updatedAt).getTime();
  });
}

export function useDocumentLinkedTasks(
  workspaceId: string | undefined,
  documentId: string | undefined,
  sessionEntries: DocumentLinkedTaskEntry[],
) {
  const enabled =
    Boolean(workspaceId && documentId && isDatabaseWorkspaceId(workspaceId));

  const query = useQuery({
    queryKey: queryKeys.tasks.board(workspaceId ?? ""),
    queryFn: () => listTasksMap(workspaceId!),
    enabled,
    staleTime: 30_000,
  });

  const entries = useMemo(() => {
    if (!documentId) return [];
    return mergeLinkedTasks(query.data ?? {}, documentId, sessionEntries);
  }, [query.data, documentId, sessionEntries]);

  return {
    entries,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
