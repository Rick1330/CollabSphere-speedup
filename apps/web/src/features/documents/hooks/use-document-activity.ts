import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchWorkspaceActivityPaginated,
  type ActivityEvent,
} from "@/api/adapters/activity";
import { queryKeys } from "@/lib/query-keys";
import { isDatabaseWorkspaceId } from "@/lib/workspace-id";

const DOCUMENT_ACTIVITY_LIMIT = 20;

function filterDocumentActivity(
  items: ActivityEvent[],
  documentId: string,
): ActivityEvent[] {
  return items.filter(
    (event) =>
      event.resource?.type === "document" && event.resource.id === documentId,
  );
}

export function useDocumentActivity(
  workspaceId: string | undefined,
  documentId: string | undefined,
) {
  const enabled =
    Boolean(workspaceId && documentId && isDatabaseWorkspaceId(workspaceId));

  const query = useQuery({
    queryKey: queryKeys.activity.document(workspaceId ?? "", documentId ?? ""),
    queryFn: async () => {
      const result = await fetchWorkspaceActivityPaginated(workspaceId!, {
        page: 1,
        pageSize: DOCUMENT_ACTIVITY_LIMIT,
        resourceType: "document",
        resourceId: documentId!,
      });
      const filtered = filterDocumentActivity(result.data.items, documentId!);
      if (filtered.length > 0) {
        return filtered.slice(0, DOCUMENT_ACTIVITY_LIMIT);
      }
      return filterDocumentActivity(
        (
          await fetchWorkspaceActivityPaginated(workspaceId!, {
            page: 1,
            pageSize: 50,
          })
        ).data.items,
        documentId!,
      ).slice(0, DOCUMENT_ACTIVITY_LIMIT);
    },
    enabled,
    staleTime: 30_000,
  });

  const events = useMemo(() => query.data ?? [], [query.data]);

  return {
    events,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
