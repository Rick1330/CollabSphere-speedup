import { createHash, randomBytes } from "node:crypto";
import type { WorkspaceRole } from "@prisma/client";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppError } from "../common/filters/app-error.filter.js";
import { PrismaClientProvider } from "../common/prisma/prisma-client.provider.js";
import { apiRuntimeEnv } from "../config/api-runtime.js";
import { canAssignRole } from "../workspaces/workspaces.policy.js";
import {
  extractRoleLabelsFromSettings,
  resolveRoleLabel,
  type WorkspaceRoleLabelsMap,
} from "../workspaces/workspace-template.application.js";
import {
  createWorkspaceInvitationEmailJob,
  enqueueWorkspaceInvitationEmailJob,
  encryptInvitationTokenForEmailQueue,
} from "./invitation-email-queue.js";

const INVITATION_EXPIRY_DAYS = 7;
const MAX_WORKSPACE_MEMBERS = 50;

const toInvitationTokenHash = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");

const createInvitationToken = () => randomBytes(32).toString("base64url");

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const invitationRoleLabel = (role: WorkspaceRole, roleLabels?: WorkspaceRoleLabelsMap) =>
  resolveRoleLabel(role, roleLabels);

const futureExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
  return expiresAt;
};

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(PrismaClientProvider) private readonly prisma: PrismaClientProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listWorkspaceInvitations({
    workspaceId,
    actorUserId,
  }: {
    workspaceId: string;
    actorUserId: string;
  }) {
    await this.findActorMembership({ workspaceId, actorUserId });
    const invitations = await this.prisma.invitation.findMany({
      where: {
        workspaceId,
        status: "pending",
        deletedAt: null,
      },
      select: {
        id: true,
        invitedEmail: true,
        role: true,
        invitedByUserId: true,
        createdAt: true,
        expiresAt: true,
        acceptedAt: true,
        invitedByUser: {
          select: { id: true, fullName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.invitedEmail,
      role: invitation.role,
      invitedById: invitation.invitedByUserId,
      invitedByFullName: invitation.invitedByUser.fullName,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
    }));
  }

  async listMyPendingInvitations({ userId }: { userId: string }) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { email: true },
    });
    if (!user) {
      throw new AppError({ code: "UNAUTHORIZED" });
    }
    const now = new Date();
    const rows = await this.prisma.invitation.findMany({
      where: {
        invitedEmail: user.email,
        status: "pending",
        deletedAt: null,
        expiresAt: { gt: now },
        workspace: { deletedAt: null },
      },
      select: {
        id: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        workspace: {
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
            status: true,
            settings: { select: { settings: true } },
          },
        },
        invitedByUser: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => {
      const roleLabels = extractRoleLabelsFromSettings(r.workspace.settings?.settings);
      return {
        id: r.id,
        role: r.role,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
        workspace: {
          id: r.workspace.id,
          name: r.workspace.name,
          type: r.workspace.type,
          icon: r.workspace.icon,
          status: r.workspace.status,
          roleLabels,
        },
        invitedByFullName: r.invitedByUser.fullName,
      };
    });
  }

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
      select: {
        id: true,
        status: true,
        name: true,
        settings: { select: { settings: true } },
      },
    });
    if (!workspace) {
      throw new AppError({ code: "WORKSPACE_NOT_FOUND" });
    }
    if (workspace.status === "archived") {
      throw new AppError({ code: "WORKSPACE_ARCHIVED_READONLY" });
    }

    const actorUser = await this.prisma.user.findFirst({
      where: { id: actorUserId, deletedAt: null },
      select: { fullName: true },
    });
    const inviterFullName = actorUser?.fullName?.trim() || "A workspace member";
    const workspaceRoleLabels = extractRoleLabelsFromSettings(workspace.settings?.settings);

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

      try {
        await this.enqueueInvitationEmailJob({
          token,
          invitedEmail: email,
          workspaceName: workspace.name,
          inviterFullName,
          role,
          roleLabels: workspaceRoleLabels,
        });
      } catch {
        await this.prisma.invitation.update({
          where: { id: created.id },
          data: {
            deletedAt: new Date(),
            status: "revoked",
          },
        });
        throw new AppError({
          code: "SERVICE_UNAVAILABLE",
          message: "Invitation could not be queued for email delivery.",
        });
      }

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
        type: invitation.workspace.type,
        icon: invitation.workspace.icon,
        memberCount: invitation.workspace._count.members,
      },
      role: invitation.role,
      invitedEmail: invitation.invitedEmail,
      invitedBy: {
        fullName: invitation.invitedByUser.fullName,
        email: invitation.invitedByUser.email,
      },
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

    return this.finalizeAcceptInvitation(invitation, user);
  }

  async acceptMyPendingInvitationById({
    invitationId,
    userId,
  }: {
    invitationId: string;
    userId: string;
  }) {
    const invitation = await this.findInvitationByIdOrThrow(invitationId);
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

    return this.finalizeAcceptInvitation(invitation, user);
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
        invitedEmail: true,
      },
    });
    if (!invitation) {
      throw new AppError({ code: "INVITATION_NOT_FOUND" });
    }

    if (!canAssignRole({ actorRole: actorMembership.role, targetRole: invitation.role })) {
      throw new AppError({ code: "FORBIDDEN" });
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
      select: {
        name: true,
        settings: { select: { settings: true } },
      },
    });
    const actorUser = await this.prisma.user.findFirst({
      where: { id: actorUserId, deletedAt: null },
      select: { fullName: true },
    });
    const inviterFullName = actorUser?.fullName?.trim() || "A workspace member";
    const workspaceRoleLabels = extractRoleLabelsFromSettings(workspace?.settings?.settings);

    const token = createInvitationToken();
    const updated = await this.prisma.invitation.update({
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

    if (workspace) {
      try {
        await this.enqueueInvitationEmailJob({
          token,
          invitedEmail: invitation.invitedEmail,
          workspaceName: workspace.name,
          inviterFullName,
          role: invitation.role,
          roleLabels: workspaceRoleLabels,
        });
      } catch {
        throw new AppError({
          code: "SERVICE_UNAVAILABLE",
          message: "Could not queue invitation email. The new link was saved; try resending.",
        });
      }
    }

    return updated;
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

  private async enqueueInvitationEmailJob(input: {
    token: string;
    invitedEmail: string;
    workspaceName: string;
    inviterFullName: string;
    role: WorkspaceRole;
    roleLabels?: WorkspaceRoleLabelsMap;
  }) {
    const encryptedInviteToken = encryptInvitationTokenForEmailQueue({
      token: input.token,
      secret: apiRuntimeEnv.JWT_ACCESS_SECRET,
    });
    const job = createWorkspaceInvitationEmailJob({
      invitedEmail: input.invitedEmail,
      workspaceName: input.workspaceName,
      inviterFullName: input.inviterFullName,
      roleLabel: invitationRoleLabel(input.role, input.roleLabels),
      encryptedInviteToken,
    });
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await enqueueWorkspaceInvitationEmailJob({ job });
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await wait(150);
        }
      }
    }
    throw lastError;
  }

  private async finalizeAcceptInvitation(
    invitation: { id: string; workspaceId: string; role: WorkspaceRole },
    user: { id: string },
  ) {
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

    this.eventEmitter?.emit?.("workspace.member_joined", {
      workspaceId: invitation.workspaceId,
      userId: user.id,
      role: membership.role,
    });

    return {
      workspaceId: invitation.workspaceId,
      membership: {
        role: membership.role,
        joinedAt: membership.joinedAt,
      },
    };
  }

  private async findInvitationByIdOrThrow(invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        deletedAt: null,
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            description: true,
            deletedAt: true,
            type: true,
            icon: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
        invitedByUser: {
          select: { fullName: true, email: true },
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
            type: true,
            icon: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
        invitedByUser: {
          select: { fullName: true, email: true },
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
