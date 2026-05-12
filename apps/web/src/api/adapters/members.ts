/**
 * Members API adapter.
 *
 * Canonical surface for everything member/invitation-related the UI needs:
 *  - async data reads (members, pending invitations)
 *  - mutating operations (invite, change role, remove, revoke)
 *  - shared TYPES (WorkspaceRole, WorkspaceMember, PendingInvitation)
 *  - role policy helpers (assignable roles, role labels/descriptions)
 *
 * Components and pages MUST import from this module rather than from
 * `@/lib/mock-members`. The mock file is the implementation detail that
 * lives behind this adapter; once a real backend lands, only this file
 * changes.
 */
import { request, ApiError as ClientApiError } from "@/api/client";
import { getWorkspaceRoleLabel } from "@/lib/role-labels";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

export interface WorkspaceMember {
  membershipId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  role: WorkspaceRole;
  roleLabel: string;
  joinedAt: string;
  lastAccessedAt: string | null;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  roleLabel: string;
  invitedBy: { id: string; fullName: string };
  createdAt: string;
  expiresAt: string;
  status: "pending" | "expired";
  lastResentAt?: string | null;
}

export interface ApiError extends Error {
  code?: string;
  requestId?: string;
}

type ListEnvelope<T> = { data?: { items?: T[]; total?: number } };
type SingleEnvelope<T> = { data?: T };

type ApiWorkspaceMember = {
  id: string;
  role: WorkspaceRole;
  joinedAt?: string;
  lastAccessedAt?: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
};

type ApiInvitation = {
  id: string;
  email: string;
  role: WorkspaceRole;
  invitedById: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  acceptedAt?: string | null;
};

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  MEMBER: "MEMBER",
  VIEWER: "VIEWER",
};

export function getRoleLabel(role: WorkspaceRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function getRoleDescription(role: string): string {
  switch (role) {
    case "OWNER":
      return "Full control including ownership transfer and workspace deletion.";
    case "ADMIN":
      return "Can manage workspace settings, members, and all content.";
    case "MANAGER":
      return "Can manage tasks, assign work, and review documents.";
    case "MEMBER":
      return "Can create and edit documents and tasks.";
    case "VIEWER":
      return "Can view all content but cannot edit or create.";
    default:
      return "";
  }
}

export function getAssignableRoles(currentUserRole: WorkspaceRole): WorkspaceRole[] {
  if (currentUserRole === "OWNER") return ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];
  if (currentUserRole === "ADMIN") return ["MANAGER", "MEMBER", "VIEWER"];
  return [];
}

export function canManageMember(
  actorRole: WorkspaceRole,
  actorUserId: string,
  target: WorkspaceMember,
): boolean {
  if (target.user.id === actorUserId) return false;
  if (target.role === "OWNER") return false;
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN") return ["MANAGER", "MEMBER", "VIEWER"].includes(target.role);
  return false;
}

const ROLE_ORDER: Record<WorkspaceRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  MANAGER: 2,
  MEMBER: 3,
  VIEWER: 4,
};

export function sortMembers(members: WorkspaceMember[]): WorkspaceMember[] {
  return [...members].sort((a, b) => {
    const r = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
    if (r !== 0) return r;
    return a.user.fullName.localeCompare(b.user.fullName);
  });
}

const mapApiError = (error: unknown): never => {
  if (error instanceof ClientApiError) {
    const next = new Error(error.message) as ApiError;
    next.code = error.code;
    throw next;
  }
  throw error;
};

const mapMember = (item: ApiWorkspaceMember): WorkspaceMember => ({
  membershipId: item.id,
  user: {
    id: item.user.id,
    fullName: item.user.fullName,
    email: item.user.email,
    avatarUrl: item.user.avatarUrl ?? null,
  },
  role: item.role,
  roleLabel: getWorkspaceRoleLabel("general", item.role),
  joinedAt: item.joinedAt ?? new Date().toISOString(),
  lastAccessedAt: item.lastAccessedAt ?? null,
});

const mapInvitation = (item: ApiInvitation): PendingInvitation => ({
  id: item.id,
  email: item.email,
  role: item.role,
  roleLabel: getWorkspaceRoleLabel("general", item.role),
  invitedBy: { id: item.invitedById, fullName: "Workspace admin" },
  createdAt: item.createdAt,
  expiresAt: item.expiresAt,
  status: new Date(item.expiresAt) < new Date() ? "expired" : "pending",
  lastResentAt: null,
});

export async function fetchMembers(workspaceId: string): Promise<{ data: { items: WorkspaceMember[] } }> {
  const payload = await request<ListEnvelope<ApiWorkspaceMember>>(`/workspaces/${workspaceId}/members`);
  return { data: { items: (payload.data?.items ?? []).map(mapMember) } };
}

export async function fetchPendingInvitations(
  workspaceId: string,
): Promise<{ data: { items: PendingInvitation[] } }> {
  const payload = await request<ListEnvelope<ApiInvitation>>(`/workspaces/${workspaceId}/invitations`);
  return { data: { items: (payload.data?.items ?? []).map(mapInvitation) } };
}

export async function changeMemberRole(
  workspaceId: string,
  membershipId: string,
  role: WorkspaceRole,
  _actorRole: WorkspaceRole,
  _actorUserId: string,
): Promise<void> {
  try {
    await request(`/workspaces/${workspaceId}/members/${membershipId}/role`, {
      method: "PATCH",
      body: { role },
    });
  } catch (error) {
    mapApiError(error);
  }
}

export async function removeMember(
  workspaceId: string,
  membershipId: string,
  _actorRole: WorkspaceRole,
  _actorUserId: string,
): Promise<void> {
  try {
    await request(`/workspaces/${workspaceId}/members/${membershipId}`, {
      method: "DELETE",
    });
  } catch (error) {
    mapApiError(error);
  }
}

export async function inviteMember(
  workspaceId: string,
  params: { email: string; role: WorkspaceRole },
  _actorRole: WorkspaceRole,
): Promise<void> {
  try {
    await request(`/workspaces/${workspaceId}/invitations`, {
      method: "POST",
      body: {
        emails: [params.email],
        role: params.role,
      },
    });
  } catch (error) {
    mapApiError(error);
  }
}

export async function revokeInvitation(
  workspaceId: string,
  invitationId: string,
  _actorRole: WorkspaceRole,
): Promise<void> {
  try {
    await request(`/workspaces/${workspaceId}/invitations/${invitationId}/revoke`, {
      method: "POST",
    });
  } catch (error) {
    mapApiError(error);
  }
}
