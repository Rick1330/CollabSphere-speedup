import type { ReadOnlyReason } from "@/features/documents/components/editor/editor-readonly-banner";
import { AuthError, getCollabToken } from "@/api/adapters/auth";
import { resolveCollabWsUrlFromEnv } from "@/lib/collab-ws-url";

const READ_ONLY_BY_POLICY_CODE: Partial<Record<string, ReadOnlyReason>> = {
  DOCUMENT_LOCKED: "locked",
  DOCUMENT_READONLY_STATUS: "submitted",
  WORKSPACE_ARCHIVED_READONLY: "workspace-archived",
  INSUFFICIENT_ROLE: "viewer",
};

export function mapReadOnlyReasonFromPolicyCode(code: string | null | undefined): ReadOnlyReason | null {
  if (!code) return null;
  return READ_ONLY_BY_POLICY_CODE[code] ?? null;
}

export interface CollabBootstrapResult {
  token: string;
  expiresInSeconds: number;
  hocuspocusUrl: string;
  readOnlyReason: ReadOnlyReason | null;
}

export async function prepareDocumentCollabBootstrap(input: {
  workspaceId: string;
  documentId: string;
}): Promise<CollabBootstrapResult> {
  try {
    const tokenData = await getCollabToken(input);
    return {
      token: tokenData.token,
      expiresInSeconds: tokenData.expiresInSeconds,
      hocuspocusUrl: resolveCollabWsUrlFromEnv(),
      readOnlyReason: null,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        token: "",
        expiresInSeconds: 0,
        hocuspocusUrl: resolveCollabWsUrlFromEnv(),
        readOnlyReason: mapReadOnlyReasonFromPolicyCode(error.code),
      };
    }
    throw error;
  }
}
