import { request } from "@/api/client";

export type GlobalRole = "USER" | "ADMIN";
export type AdminWorkspaceType = "professional" | "academic" | "general";
export type AdminWorkspaceStatus = "active" | "archived";
export type AuditSeverity = "info" | "warn" | "error";

export interface AdminOperationalStats {
  totalUsers: number;
  activeUsersLast7Days: number;
  newUsersLast7Days: number;
  totalWorkspaces: number;
  archivedWorkspaces: number;
  newWorkspacesLast7Days: number;
  totalDocuments: number;
  totalTasks: number;
  totalComments: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  adminCount: number;
  deactivatedUsers: number;
  warnEventsLast24h: number;
  errorEventsLast24h: number;
  eventsTrend: number[];
  activeUsersTrend: number[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  globalRole: GlobalRole;
  isActive: boolean;
  authProvider: "local" | "google";
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUser {
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  workspaces: Array<{
    id: string;
    name: string;
    type: AdminWorkspaceType;
    role: string;
    roleLabel: string;
  }>;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  type: AdminWorkspaceType;
  status: AdminWorkspaceStatus;
  ownerName: string;
  ownerEmail: string;
  memberCount: number;
  documentCount: number;
  taskCount: number;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  eventType: string;
  severity: AuditSeverity;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  ipAddress: string;
  details: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

type ListEnvelope<T> = { data?: { items?: T[]; total?: number }; meta?: { pagination?: { page: number; pageSize: number; totalItems: number; totalPages: number } } };
type SingleEnvelope<T> = { data?: { resource?: T } };

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
