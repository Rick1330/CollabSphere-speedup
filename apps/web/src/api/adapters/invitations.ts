/**
 * Invitations for the signed-in user (pending invites by email).
 */
import { request } from "@/api/client";
import { parseApiSingleEnvelope } from "@/api/client/envelope";

type ListEnvelope<T> = { data?: { items?: T[]; total?: number } };

function parseListEnvelope<T>(payload: unknown): T[] {
  const items = (payload as ListEnvelope<T> | null | undefined)?.data?.items;
  if (!Array.isArray(items)) {
    throw new Error("Invalid API list envelope.");
  }
  return items;
}

import type { WorkspaceRoleLabelsMap } from "@/lib/role-labels";

export type PendingInvitationRow = {
  id: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  workspace: {
    id: string;
    name: string;
    type: string;
    icon: string | null;
    status: string;
    roleLabels?: WorkspaceRoleLabelsMap;
  };
  invitedByFullName: string;
};

export async function fetchMyPendingInvitations(): Promise<PendingInvitationRow[]> {
  const payload = await request<unknown>("/invitations/me/pending");
  return parseListEnvelope<PendingInvitationRow>(payload);
}

export type AcceptInvitationResult = {
  workspaceId: string;
  membership: { role: string; joinedAt: string };
};

export async function acceptMyPendingInvitation(invitationId: string): Promise<AcceptInvitationResult> {
  const payload = await request<unknown>(`/invitations/me/pending/${invitationId}/accept`, {
    method: "POST",
  });
  return parseApiSingleEnvelope<AcceptInvitationResult>(payload);
}
