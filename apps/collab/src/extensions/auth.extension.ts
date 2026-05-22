import type { WorkspaceRole } from "@prisma/client";
import type { Extension } from "@hocuspocus/server";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

type AuthClaims = {
  sub: string;
  workspaceId: string;
  documentId: string;
};

const roleLevels: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  MANAGER: 3,
  ADMIN: 4,
  OWNER: 5,
};

const parseClaims = (token: string): AuthClaims => {
  let payload: unknown;

  try {
    payload = jwt.verify(token, process.env.COLLAB_JWT_SECRET!);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("TOKEN_EXPIRED");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("TOKEN_INVALID");
    }
    throw new Error("AUTH_FAILED");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("TOKEN_INVALID");
  }

  const subject = (payload as { sub?: unknown }).sub;
  if (typeof subject !== "string" || !subject.trim()) {
    throw new Error("TOKEN_INVALID");
  }

  const workspaceId = (payload as { workspaceId?: unknown }).workspaceId;
  const documentId = (payload as { documentId?: unknown }).documentId;
  if (typeof workspaceId !== "string" || !workspaceId.trim()) {
    throw new Error("TOKEN_INVALID");
  }
  if (typeof documentId !== "string" || !documentId.trim()) {
    throw new Error("TOKEN_INVALID");
  }

  return {
    sub: subject.trim(),
    workspaceId: workspaceId.trim(),
    documentId: documentId.trim(),
  };
};

const isDev = process.env.NODE_ENV !== "production";

const parseDocumentId = (documentName: string): string => {
  const match = documentName.match(/^doc:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (!match) {
    throw new Error("INVALID_DOCUMENT_NAME");
  }
  return match[1];
};

export const authExtension: Extension = {
  async onAuthenticate(data) {
    const { token, documentName } = data;
    if (!token || !token.trim()) {
      throw new Error("AUTH_REQUIRED");
    }

    let claims: AuthClaims;
    try {
      claims = parseClaims(token);
    } catch (error) {
      throw error;
    }
    const documentId = parseDocumentId(documentName);
    if (claims.documentId !== documentId) {
      throw new Error("TOKEN_DOCUMENT_MISMATCH");
    }

    let user: { id: string; fullName: string | null } | null = null;
    let doc: {
      id: string;
      workspaceId: string;
      isLocked: boolean;
      status: string;
    } | null = null;
    let membership: { role: WorkspaceRole } | null = null;

    try {
      user = await prisma.user.findFirst({
        where: {
          id: claims.sub,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          fullName: true,
        },
      });
      if (!user) {
        throw new Error("USER_INACTIVE_OR_DELETED");
      }

      doc = await prisma.document.findFirst({
        where: {
          id: documentId,
          workspaceId: claims.workspaceId,
          deletedAt: null,
        },
        select: {
          id: true,
          workspaceId: true,
          isLocked: true,
          status: true,
        },
      });
      if (!doc) {
        throw new Error("DOCUMENT_NOT_FOUND");
      }
      if (doc.workspaceId !== claims.workspaceId) {
        throw new Error("TOKEN_WORKSPACE_MISMATCH");
      }

      membership = await prisma.workspaceMember.findFirst({
        where: {
          userId: user.id,
          workspaceId: doc.workspaceId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      });
      if (!membership) {
        throw new Error("NOT_WORKSPACE_MEMBER");
      }
    } catch (error) {
      if (error instanceof Error) {
        const known = new Set([
          "USER_INACTIVE_OR_DELETED",
          "DOCUMENT_NOT_FOUND",
          "NOT_WORKSPACE_MEMBER",
          "TOKEN_DOCUMENT_MISMATCH",
          "TOKEN_WORKSPACE_MISMATCH",
        ]);
        if (known.has(error.message)) {
          if (isDev) {
            console.warn("[collab][auth] rejected", { documentId, reason: error.message });
          }
          throw error;
        }
      }
      console.error("[collab][auth] Database lookup failed", error);
      throw new Error("SERVICE_UNAVAILABLE");
    }

    const userLevel = roleLevels[membership.role] ?? 0;
    const statusBlocked = ["submitted", "approved"].includes(doc.status) && userLevel < 3;
    const lockBlocked = doc.isLocked && userLevel < 3;
    const canEdit = userLevel >= 2 && !statusBlocked && !lockBlocked;

    const connectionConfig = (data as {
      connectionConfig?: { isAuthenticated?: boolean; readOnly?: boolean };
    }).connectionConfig;
    if (connectionConfig) {
      connectionConfig.isAuthenticated = true;
      connectionConfig.readOnly = !canEdit;
    }

    const context = (data as { context?: Record<string, unknown> }).context;
    if (context) {
      context.userId = user.id;
      context.userFullName = user.fullName ?? "";
      context.documentId = documentId;
      context.workspaceId = doc.workspaceId;
      context.role = membership.role;
      context.canEdit = canEdit;
      context.readOnly = !canEdit;
    }

    const connection = (data as { connection?: Record<string, unknown> }).connection;
    if (connection) {
      (connection as any).userId = user.id;
      (connection as any).userFullName = user.fullName ?? "";
      (connection as any).documentId = documentId;
      (connection as any).workspaceId = doc.workspaceId;
      (connection as any).role = membership.role;
      (connection as any).canEdit = canEdit;
      (connection as any).readOnly = !canEdit;
    }

    if (isDev) {
      console.info("[collab][auth] ok", {
        documentId,
        userId: user.id,
        workspaceId: doc.workspaceId,
        role: membership.role,
        readOnly: !canEdit,
      });
    }

    return {
      userId: user.id,
      canEdit,
      workspaceId: doc.workspaceId,
      documentId,
      role: membership.role,
    };
  },
};
