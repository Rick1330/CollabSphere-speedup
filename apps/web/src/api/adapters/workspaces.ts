/**
 * Workspace API adapter — live Nest reads (`/api/v1/workspaces`).
 */
import type { WorkspaceSummaryContract } from "@/api/contracts";
import { request } from "@/api/client";
import { parseApiSingleEnvelope } from "@/api/client/envelope";
import type { StoredWorkspace } from "@/features/workspace/store/workspace-store";
import type { WorkspaceForSidebar } from "@/features/workspace/components/workspace-sidebar";
import type { WorkspaceRole } from "@/api/adapters/members";
import { getWorkspaceRoleLabel } from "@/lib/role-labels";
import { getRolePermissions, type WorkspaceRoleKey } from "@/lib/persona-scenario";

type ListEnvelope<T> = {
  data?: { items?: T[]; total?: number };
};

export type WorkspaceCoreDto = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  type: "professional" | "academic" | "general";
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type MineWorkspaceRow = {
  membershipId: string;
  role: WorkspaceRole;
  workspace: WorkspaceCoreDto;
  memberCount: number;
  documentCount: number;
  taskCount: number;
  recentMembers: { id: string; fullName: string }[];
};

type ApiWorkspaceDetail = {
  membership: { role: WorkspaceRole };
  workspace: WorkspaceCoreDto;
};

export type CreateWorkspaceInput = {
  name: string;
  description?: string;
  icon?: string;
  type: WorkspaceCoreDto["type"];
  templateId?: string | null;
};

export async function createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceCoreDto> {
  const payload = await request<unknown>("/workspaces", {
    method: "POST",
    body: {
      name: input.name,
      description: input.description?.trim() || undefined,
      icon: input.icon?.trim() || undefined,
      type: input.type,
      templateId: input.templateId ?? undefined,
    },
  });
  const data = parseApiSingleEnvelope<{ workspace?: WorkspaceCoreDto }>(payload);
  if (!data.workspace?.id) {
    throw new Error("Workspace creation response is missing workspace.");
  }
  return data.workspace;
}

export async function listMineWorkspaceRows(): Promise<MineWorkspaceRow[]> {
  const payload = await request<ListEnvelope<MineWorkspaceRow>>("/workspaces");
  return payload.data?.items ?? [];
}

export async function listMyWorkspaces(): Promise<WorkspaceSummaryContract[]> {
  const rows = await listMineWorkspaceRows();
  return rows.map((entry) => ({
    id: entry.workspace.id,
    slug: entry.workspace.id,
    name: entry.workspace.name,
    memberCount: entry.memberCount,
    updatedAt: entry.workspace.updatedAt,
  }));
}

export async function getStoredWorkspace(id: string): Promise<StoredWorkspace | null> {
  const payload = await request<unknown>(`/workspaces/${id}`);
  try {
    const data = parseApiSingleEnvelope<ApiWorkspaceDetail>(payload);
    const ws = data.workspace;
    const role = data.membership.role;
    if (!ws?.id) return null;
    return {
      id: ws.id,
      name: ws.name,
      description: ws.description ?? "",
      icon: ws.icon ?? undefined,
      type: ws.type,
      status: ws.status,
      templateId: null,
      templateName: null,
      roleLabel: getWorkspaceRoleLabel(ws.type, role),
      createdAt: ws.createdAt,
      lastAccessedAt: ws.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function fetchWorkspaceSidebarContext(
  workspaceId: string,
): Promise<{ sidebar: WorkspaceForSidebar; myRole: WorkspaceRole }> {
  const payload = await request<unknown>(`/workspaces/${workspaceId}`);
  const data = parseApiSingleEnvelope<ApiWorkspaceDetail>(payload);
  const ws = data.workspace;
  const role = data.membership.role;
  const rk = role as WorkspaceRoleKey;
  const rp = getRolePermissions(rk);
  const sidebar: WorkspaceForSidebar = {
    id: ws.id,
    name: ws.name,
    description: ws.description ?? undefined,
    icon: ws.icon ?? undefined,
    type: ws.type,
    status: ws.status,
    roleLabel: getWorkspaceRoleLabel(ws.type, role).toUpperCase(),
    permissions: {
      canCreateContent: rp.canCreateContent,
      canEditSettings: rp.canEditSettings,
      canViewAnalytics: rp.canViewAnalytics,
    },
  };
  return { sidebar, myRole: role };
}
