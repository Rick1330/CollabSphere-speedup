import { request } from "@/api/client";
import {
  formatBytes,
  type AdminOperationalStats,
  type AdminUser,
  type AdminUserDetail,
  type AdminWorkspace,
  type AuditEvent,
  type GlobalRole,
} from "@/lib/mock-admin";

type ListEnvelope<T> = { data?: { items?: T[]; total?: number }; meta?: { pagination?: { page: number; pageSize: number; totalItems: number; totalPages: number } } };
type SingleEnvelope<T> = { data?: { resource?: T } };

export { formatBytes };
export type { AdminUser, AdminUserDetail, AdminWorkspace, AuditEvent, GlobalRole };

export async function fetchAdminOperationalStats(): Promise<{ data: AdminOperationalStats }> {
  const payload = await request<SingleEnvelope<AdminOperationalStats>>("/admin/overview");
  return { data: payload.data?.resource as AdminOperationalStats };
}

export async function fetchRecentCriticalEvents(limit = 8) {
  const audit = await fetchAuditLog({ dateRange: "all", page: 1, pageSize: Math.max(1, limit), severity: "error" });
  return { data: { items: audit.data.items } };
}

export async function fetchTopWorkspaces(limit = 5) {
  const page = await fetchAdminWorkspaces({ page: 1, pageSize: Math.max(1, limit) });
  return { data: { items: page.data.items } };
}

export async function fetchAdminUsers(params: { search?: string; page: number; pageSize: number }) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search) query.set("q", params.search);
  return request<ListEnvelope<AdminUser>>(`/admin/users?${query.toString()}`);
}

export async function fetchAdminUserDetail(userId: string) {
  const payload = await request<SingleEnvelope<AdminUserDetail>>(`/admin/users/${userId}`);
  return { data: payload.data?.resource as AdminUserDetail };
}

export async function fetchAdminWorkspaces(params: { search?: string; page: number; pageSize: number }) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search) query.set("q", params.search);
  return request<ListEnvelope<AdminWorkspace>>(`/admin/workspaces?${query.toString()}`);
}

export async function fetchAuditLog(params: {
  eventType?: string;
  severity?: string;
  dateRange: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.severity) query.set("severity", params.severity);
  if (params.search) query.set("q", params.search);
  return request<ListEnvelope<AuditEvent>>(`/admin/audit?${query.toString()}`);
}

export async function adminDeactivateUser(userId: string): Promise<void> {
  await request(`/admin/users/${userId}/deactivate`, { method: "PATCH" });
}
export async function adminReactivateUser(userId: string): Promise<void> {
  await request(`/admin/users/${userId}/reactivate`, { method: "PATCH" });
}
export async function adminPromoteUser(userId: string): Promise<void> {
  await request(`/admin/users/${userId}/promote`, { method: "PATCH" });
}
export async function adminDemoteUser(userId: string): Promise<void> {
  await request(`/admin/users/${userId}/demote`, { method: "PATCH" });
}
export async function adminArchiveWorkspace(workspaceId: string): Promise<void> {
  await request(`/admin/workspaces/${workspaceId}/archive`, { method: "PATCH" });
}
export async function adminUnarchiveWorkspace(workspaceId: string): Promise<void> {
  await request(`/admin/workspaces/${workspaceId}/unarchive`, { method: "PATCH" });
}
export async function adminForceDeleteWorkspace(workspaceId: string): Promise<void> {
  await request(`/admin/workspaces/${workspaceId}/force-delete`, { method: "PATCH" });
}
