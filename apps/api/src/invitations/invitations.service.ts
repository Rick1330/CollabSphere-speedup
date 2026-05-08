import { createHash, randomBytes } from "node:crypto";
import type { WorkspaceRole } from "@prisma/client";
import { Injectable } from "@nestjs/common";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { canAssignRole } from "../workspaces/workspaces.policy.js";

const INVITATION_EXPIRY_DAYS = 7;
const MAX_WORKSPACE_MEMBERS = 50;

const toInvitationTokenHash = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");

const createInvitationToken = () => randomBytes(32).toString("base64url");

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const futureExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
  return expiresAt;
};

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaClientProvider) {}

  async createInvitations({
    workspaceId,
    actorUserId,
    emails,
    role,
  }: {
    workspaceId: string;
    actorUserId: string;
    emails: string[];
    role: WorkspaceRole;
  }) {
    if (!emails.length) {
      throw new AppError({ code: "VALIDATION_ERROR", message: "At least one email is required." });
    }

    const actorMembership = await this.findActorMembership({ workspaceId, actorUserId });

    if (!canAssignRole({ actorRole: actorMembership.role, targetRole: role })) {
      throw new AppError({ code: "FORBIDDEN_ROLE_ASSIGNMENT" });
    }

    const normalizedEmails = Array.from(new Set(emails.map(normalizeEmail)));
    for (const email of normalizedEmails) {
      if (!isEmailValid(email)) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: `Invalid email: ${email}`,
        });
      }
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!workspace) {
      throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    }
    if (workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }

    const activeMemberCount = await this.prisma.workspaceMember.count({
      where: { workspaceId, isActive: true, deletedAt: null },
    });
    if (activeMemberCount >= MAX_WORKSPACE_MEMBERS) {
      throw new AppError({ code: "WORKSPACE_MEMBER_LIMIT_REACHED" });
    }

    const createdInvitations: Array<{
      id: string;
      email: string;
      role: WorkspaceRole;
      status: string;
      expiresAt: Date;
    }> = [];

    for (const email of normalizedEmails) {
      const alreadyMember = await this.prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          isActive: true,
          deletedAt: null,
          user: { email },
        },
        select: { id: true },
      });
      if (alreadyMember) {
        throw new AppError({ code: "ALREADY_MEMBER" });
      }

      await this.prisma.invitation.updateMany({
        where: {
          workspaceId,
          invitedEmail: email,
          status: "pending",
          deletedAt: null,
        },
        data: {
          status: "revoked",
        },
      });

      const token = createInvitationToken();
      const created = await this.prisma.invitation.create({
        data: {
          workspaceId,
          invitedEmail: email,
          role,
          tokenHash: toInvitationTokenHash(token),
          status: "pending",
          invitedByUserId: actorUserId,
          expiresAt: futureExpiryDate(),
        },
      });

      createdInvitations.push({
        id: created.id,
        email: created.invitedEmail,
        role: created.role,
        status: created.status,
        expiresAt: created.expiresAt,
      });
    }

    return createdInvitations;
  }

  async getInvitationPreviewByToken(token: string) {
    const invitation = await this.findInvitationByTokenOrThrow(token);
    this.assertInvitationUsable(invitation);

    return {
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      workspace: {
        id: invitation.workspace.id,
        name: invitation.workspace.name,
        description: invitation.workspace.description,
      },
      role: invitation.role,
      invitedEmail: invitation.invitedEmail,
    };
  }

  async acceptInvitationByToken({
    token,
    userId,
  }: {
    token: string;
    userId: string;
  }) {
    const invitation = await this.findInvitationByTokenOrThrow(token);
    this.assertInvitationUsable(invitation);

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new AppError({ code: "UNAUTHORIZED" });
    }

    if (normalizeEmail(user.email) !== normalizeEmail(invitation.invitedEmail)) {
      throw new AppError({ code: "EMAIL_MISMATCH" });
    }

    const existingMembership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invitation.workspaceId,
        userId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (existingMembership?.isActive) {
      throw new AppError({ code: "ALREADY_MEMBER" });
    }

    const activeMemberCount = await this.prisma.workspaceMember.count({
      where: {
        workspaceId: invitation.workspaceId,
        isActive: true,
        deletedAt: null,
      },
    });
    if (activeMemberCount >= MAX_WORKSPACE_MEMBERS) {
      throw new AppError({ code: "WORKSPACE_MEMBER_LIMIT_REACHED" });
    }

    const now = new Date();
    const membership = await this.prisma.$transaction(async (tx) => {
      const nextMembership = existingMembership
        ? await tx.workspaceMember.update({
            where: { id: existingMembership.id },
            data: {
              role: invitation.role,
              isActive: true,
              joinedAt: now,
              leftAt: null,
              lastAccessedAt: now,
            },
          })
        : await tx.workspaceMember.create({
            data: {
              workspaceId: invitation.workspaceId,
              userId: user.id,
              role: invitation.role,
              isActive: true,
              joinedAt: now,
              lastAccessedAt: now,
            },
          });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "accepted",
          acceptedAt: now,
          acceptedByUserId: user.id,
        },
      });

      return nextMembership;
    });

    return {
      workspaceId: invitation.workspaceId,
      membership: {
        role: membership.role,
        joinedAt: membership.joinedAt,
      },
    };
  }

  async resendInvitation({
    workspaceId,
    invitationId,
    actorUserId,
  }: {
    workspaceId: string;
    invitationId: string;
    actorUserId: string;
  }) {
    const actorMembership = await this.findActorMembership({ workspaceId, actorUserId });
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
      },
    });
    if (!invitation) {
      throw new AppError({ code: "INVITATION_NOT_FOUND" });
    }

    if (!canAssignRole({ actorRole: actorMembership.role, targetRole: invitation.role })) {
      throw new AppError({ code: "FORBIDDEN" });
    }

    const token = createInvitationToken();
    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash: toInvitationTokenHash(token),
        status: "pending",
        acceptedAt: null,
        acceptedByUserId: null,
        expiresAt: futureExpiryDate(),
      },
      select: {
        id: true,
        invitedEmail: true,
        role: true,
        status: true,
        expiresAt: true,
      },
    });
  }

  async revokeInvitation({
    workspaceId,
    invitationId,
    actorUserId,
  }: {
    workspaceId: string;
    invitationId: string;
    actorUserId: string;
  }) {
    const actorMembership = await this.findActorMembership({ workspaceId, actorUserId });
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, workspaceId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!invitation) {
      throw new AppError({ code: "INVITATION_NOT_FOUND" });
    }
    if (!canAssignRole({ actorRole: actorMembership.role, targetRole: invitation.role })) {
      throw new AppError({ code: "FORBIDDEN" });
    }

    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "revoked" },
      select: { id: true, status: true },
    });
  }

  private async findActorMembership({
    workspaceId,
    actorUserId,
  }: {
    workspaceId: string;
    actorUserId: string;
  }) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: actorUserId,
        isActive: true,
        deletedAt: null,
        workspace: { deletedAt: null },
      },
      select: {
        id: true,
        role: true,
      },
    });
    if (!membership) {
      throw new AppError({ code: "NOT_WORKSPACE_MEMBER" });
    }
    return membership;
  }

  private async findInvitationByTokenOrThrow(token: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        tokenHash: toInvitationTokenHash(token),
        deletedAt: null,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            description: true,
            deletedAt: true,
          },
        },
      },
    });
    if (!invitation) {
      throw new AppError({ code: "INVITATION_NOT_FOUND" });
    }
    if (invitation.workspace.deletedAt) {
      throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    }
    return invitation;
  }

  private assertInvitationUsable(invitation: {
    status: string;
    expiresAt: Date;
  }) {
    if (invitation.status !== "pending") {
      throw new AppError({ code: "INVITATION_ALREADY_USED" });
    }
    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new AppError({
        code: "INVITATION_EXPIRED",
        statusCode: 410,
      });
    }
  }
}
