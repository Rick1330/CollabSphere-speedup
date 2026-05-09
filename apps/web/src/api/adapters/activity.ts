import { request } from "@/api/client";
import type { ActivityEvent, ActivityEventKey } from "@/lib/mock-activity";

type ListEnvelope<T> = {
  data?: { items?: T[]; total?: number };
  meta?: { pagination?: { page: number; pageSize: number; totalItems: number; totalPages: number } };
};

export type { ActivityEvent, ActivityEventKey };

export async function fetchWorkspaceActivityPaginated(
  workspaceId: string,
  params: { page: number; pageSize: number },
): Promise<{
  data: { items: ActivityEvent[] };
  meta: { pagination: { page: number; pageSize: number; totalItems: number; totalPages: number } };
}> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  const payload = await request<ListEnvelope<ActivityEvent>>(
    `/workspaces/${workspaceId}/activity?${query.toString()}`,
  );
  return {
    data: { items: payload.data?.items ?? [] },
    meta: {
      pagination:
        payload.meta?.pagination ?? {
          page: params.page,
          pageSize: params.pageSize,
          totalItems: payload.data?.total ?? 0,
          totalPages: Math.max(1, Math.ceil((payload.data?.total ?? 0) / params.pageSize)),
        },
    },
  };
}
