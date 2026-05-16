import nodemailer from "nodemailer";
import {
  decryptInvitationTokenFromEmailQueue,
  type WorkspaceInvitationEmailJob,
} from "./workspace-invitation-email-queue.js";

const trimTrailingSlashes = (value: string) => {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }
  return value.slice(0, end);
};

const dispatchInvitationEmail = async ({
  email,
  workspaceName,
  inviterFullName,
  roleLabel,
  acceptUrl,
}: {
  email: string;
  workspaceName: string;
  inviterFullName: string;
  roleLabel: string;
  acceptUrl: string;
}) => {
  const smtpHost = process.env.EMAIL_SMTP_HOST?.trim();
  const smtpPortRaw = process.env.EMAIL_SMTP_PORT?.trim();
  if (smtpHost && smtpPortRaw) {
    const smtpPort = Number.parseInt(smtpPortRaw, 10);
    if (Number.isFinite(smtpPort) && smtpPort > 0) {
      const transport = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
      });
      await transport.sendMail({
        from: "no-reply@collabsphere.local",
        to: email,
        subject: `You're invited to ${workspaceName} on CollabSphere`,
        text: `Hi,\n\n${inviterFullName} invited you to join "${workspaceName}" as ${roleLabel}.\n\nAccept: ${acceptUrl}\n\nIf you did not expect this, you can ignore this email.`,
        html: `<p>Hi,</p><p><strong>${inviterFullName}</strong> invited you to join <strong>${workspaceName}</strong> as <strong>${roleLabel}</strong>.</p><p><a href="${acceptUrl}">Accept invitation</a></p><p>If you did not expect this, you can ignore this email.</p>`,
      });
      return;
    }
  }

  console.info(`[worker] invitation email fallback (not sent via SMTP) for ${email}: ${acceptUrl}`);
};

export const sendWorkspaceInvitationEmailJob = async ({
  job,
  jwtAccessSecret,
  baseUrl,
}: {
  job: WorkspaceInvitationEmailJob;
  jwtAccessSecret: string;
  baseUrl: string;
}) => {
  const token = decryptInvitationTokenFromEmailQueue({
    encryptedToken: job.encryptedInviteToken,
    secret: jwtAccessSecret,
  });
  const acceptUrl = `${trimTrailingSlashes(baseUrl)}/invite/${encodeURIComponent(token)}`;
  await dispatchInvitationEmail({
    email: job.invitedEmail,
    workspaceName: job.workspaceName,
    inviterFullName: job.inviterFullName,
    roleLabel: job.roleLabel,
    acceptUrl,
  });

  console.log(
    `[worker] workspace invitation email dispatched to ${job.invitedEmail} (workspace=${job.workspaceName})`,
  );
};
