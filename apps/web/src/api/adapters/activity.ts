import { request } from "@/api/client";

export type ActivityEventKey =
  | "task.created"
  | "task.assigned"
  | "task.status_changed"
  | "task.completed"
  | "task.deleted"
  | "document.created"
  | "document.renamed"
  | "document.moved"
  | "document.locked"
  | "document.unlocked"
  | "document.version_created"
  | "document.version_restored"
  | "document.submitted"
  | "document.reviewed"
  | "workspace.member_joined"
  | "workspace.member_removed"
  | "workspace.member_role_changed"
  | "workspace.role_changed"
  | "workspace.created"
  | "workspace.archived"
  | "workspace.unarchived"
  | "comment.created"
  | "comment.resolved";

export interface ActivityEvent {
  id: string;
  eventKey: ActivityEventKey;
  actor: {
    id: string;
    fullName: string;
    avatarUrl?: string;
    isFormer?: boolean;
  };
  summary: string;
  resource?: { type: "document" | "task" | "comment" | "workspace"; id: string; title: string };
  createdAt: string;
}

type ListEnvelope<T> = {
  data?: { items?: T[]; total?: number };
  meta?: { pagination?: { page: number; pageSize: number; totalItems: number; totalPages: number } };
};

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
