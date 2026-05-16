import { request } from "@/api/client";
import { parseApiSingleEnvelope } from "@/api/client/envelope";

export type InvitationPreview = {
  status: string;
  expiresAt: string;
  workspace: {
    id: string;
    name: string;
    description: string | null;
    type: "professional" | "academic" | "general";
    icon: string | null;
    memberCount: number;
  };
  role: string;
  invitedEmail: string;
  invitedBy: { fullName: string; email: string };
};

export async function fetchInvitationPreview(token: string): Promise<InvitationPreview> {
  const raw = await request<unknown>(`/invitations/${encodeURIComponent(token)}`);
  return parseApiSingleEnvelope<InvitationPreview>(raw);
}

export async function acceptWorkspaceInvitation(token: string): Promise<{ workspaceId: string }> {
  const raw = await request<unknown>(`/invitations/${encodeURIComponent(token)}/accept`, {
    method: "POST",
  });
  return parseApiSingleEnvelope<{ workspaceId: string }>(raw);
}
