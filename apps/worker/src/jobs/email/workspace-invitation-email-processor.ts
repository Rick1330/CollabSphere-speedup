import {
  createWorkspaceInvitationEmailJob,
  dequeueDueWorkspaceInvitationEmailJobs,
  enqueueWorkspaceInvitationEmailJob,
  type WorkspaceInvitationEmailJob,
} from "./workspace-invitation-email-queue.js";
import { sendWorkspaceInvitationEmailJob } from "./workspace-invitation-email-job.js";

const defaultPollIntervalMs = 2000;
const retryBackoffMs = [30_000, 120_000, 300_000] as const;
const maxJobsPerTick = 5;

const computeNextAttemptTime = ({ attempts, now }: { attempts: number; now: Date }) => {
  const backoffIndex = Math.max(0, Math.min(retryBackoffMs.length - 1, attempts - 1));
  return new Date(now.getTime() + retryBackoffMs[backoffIndex]);
};

const createRetryJob = ({
  job,
  attemptedAt,
  attempts,
}: {
  job: WorkspaceInvitationEmailJob;
  attemptedAt: Date;
  attempts: number;
}) => {
  const retryJob = createWorkspaceInvitationEmailJob({
    invitedEmail: job.invitedEmail,
    workspaceName: job.workspaceName,
    inviterFullName: job.inviterFullName,
    roleLabel: job.roleLabel,
    encryptedInviteToken: job.encryptedInviteToken,
    now: attemptedAt,
  });

  retryJob.jobId = job.jobId;
  retryJob.createdAt = job.createdAt;
  retryJob.attempts = attempts;
  retryJob.maxAttempts = job.maxAttempts;
  retryJob.nextAttemptAt = computeNextAttemptTime({
    attempts,
    now: attemptedAt,
  }).toISOString();

  return retryJob;
};

const scheduleRetryJob = async ({
  job,
  attemptedAt,
  attempts,
  message,
}: {
  job: WorkspaceInvitationEmailJob;
  attemptedAt: Date;
  attempts: number;
  message: string;
}) => {
  try {
    const retryJob = createRetryJob({
      job,
      attemptedAt,
      attempts,
    });
    await enqueueWorkspaceInvitationEmailJob({
      job: retryJob,
    });
    console.warn(
      `[worker] invitation email job retry scheduled (job=${job.jobId}, attempts=${attempts}/${job.maxAttempts}, reason=${message})`,
    );
  } catch (enqueueError) {
    const enqueueMessage = enqueueError instanceof Error ? enqueueError.message : String(enqueueError);
    console.error(
      `[worker] failed to re-enqueue invitation email retry job (job=${job.jobId}, reason=${enqueueMessage})`,
    );
  }
};

export const startWorkspaceInvitationEmailProcessor = ({
  jwtAccessSecret,
  baseUrl,
  pollIntervalMs = defaultPollIntervalMs,
}: {
  jwtAccessSecret: string;
  baseUrl: string;
  pollIntervalMs?: number;
}) => {
  let processing = false;

  const tick = async () => {
    if (processing) {
      return;
    }

    processing = true;

    try {
      const now = new Date();
      const dueJobs = await dequeueDueWorkspaceInvitationEmailJobs({
        now,
        limit: maxJobsPerTick,
      });

      for (const job of dueJobs) {
        try {
          await sendWorkspaceInvitationEmailJob({
            job,
            jwtAccessSecret,
            baseUrl,
          });
        } catch (error) {
          const attempts = job.attempts + 1;
          const isRetryable = attempts < job.maxAttempts;
          const message = error instanceof Error ? error.message : String(error);

          if (isRetryable) {
            await scheduleRetryJob({
              job,
              attemptedAt: now,
              attempts,
              message,
            });
            continue;
          }

          console.error(
            `[worker] invitation email job permanently failed (job=${job.jobId}, attempts=${attempts}/${job.maxAttempts}, reason=${message})`,
          );
        }
      }
    } catch (tickError) {
      const tickMessage = tickError instanceof Error ? tickError.message : String(tickError);
      console.error(`[worker] workspace invitation email processor tick failed: ${tickMessage}`);
    } finally {
      processing = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, pollIntervalMs);

  void tick();

  return () => clearInterval(timer);
};
