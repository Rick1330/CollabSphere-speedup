import { randomBytes } from "node:crypto";
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type WorkspaceInvitationEmailJob = {
  jobId: string;
  createdAt: string;
  nextAttemptAt: string;
  attempts: number;
  maxAttempts: number;
  invitedEmail: string;
  workspaceName: string;
  inviterFullName: string;
  roleLabel: string;
  /** AES-GCM payload from `encryptVerificationToken` (invite token). */
  encryptedInviteToken: string;
};

const queueLockAcquireTimeoutMs = 5_000;
const queueLockPollIntervalMs = 25;

export const defaultWorkspaceInvitationEmailQueueFilePath = () =>
  path.resolve(process.cwd(), ".tmp", "queues", "workspace-invitation-email-jobs.json");

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const acquireQueueLock = async (lockFilePath: string) => {
  const startedAt = Date.now();
  while (true) {
    try {
      const lockHandle = await open(lockFilePath, "wx");
      await lockHandle.close();
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      if (Date.now() - startedAt >= queueLockAcquireTimeoutMs) {
        throw new Error(`Timed out acquiring invitation email queue lock: ${lockFilePath}`);
      }
      await wait(queueLockPollIntervalMs);
    }
  }
};

const releaseQueueLock = async (lockFilePath: string) => {
  await rm(lockFilePath, { force: true }).catch((error) => {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  });
};

export const withWorkspaceInvitationEmailQueueLock = async <T>({
  queueFilePath,
  operation,
}: {
  queueFilePath: string;
  operation: () => Promise<T>;
}) => {
  const queueDirectory = path.dirname(queueFilePath);
  const lockFilePath = `${queueFilePath}.lock`;
  await mkdir(queueDirectory, { recursive: true });
  await acquireQueueLock(lockFilePath);
  try {
    return await operation();
  } finally {
    await releaseQueueLock(lockFilePath);
  }
};

export const isWorkspaceInvitationEmailJob = (value: unknown): value is WorkspaceInvitationEmailJob => {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  const strings = [
    "jobId",
    "createdAt",
    "nextAttemptAt",
    "invitedEmail",
    "workspaceName",
    "inviterFullName",
    "roleLabel",
    "encryptedInviteToken",
  ] as const;
  const nums = ["attempts", "maxAttempts"] as const;
  return (
    strings.every((k) => typeof c[k] === "string") && nums.every((k) => typeof c[k] === "number")
  );
};

export const readWorkspaceInvitationEmailJobs = async ({ queueFilePath }: { queueFilePath: string }) => {
  try {
    const raw = await readFile(queueFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [] as WorkspaceInvitationEmailJob[];
    return parsed.filter(isWorkspaceInvitationEmailJob);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [] as WorkspaceInvitationEmailJob[];
    throw error;
  }
};

export const writeWorkspaceInvitationEmailJobs = async ({
  queueFilePath,
  jobs,
}: {
  queueFilePath: string;
  jobs: WorkspaceInvitationEmailJob[];
}) => {
  await mkdir(path.dirname(queueFilePath), { recursive: true });
  const temporaryQueueFilePath = `${queueFilePath}.${randomBytes(8).toString("hex")}.tmp`;
  let renamed = false;
  try {
    await writeFile(temporaryQueueFilePath, `${JSON.stringify(jobs, null, 2)}\n`, "utf8");
    await rename(temporaryQueueFilePath, queueFilePath);
    renamed = true;
  } finally {
    if (!renamed) {
      await rm(temporaryQueueFilePath, { force: true }).catch(() => undefined);
    }
  }
};

export const createWorkspaceInvitationEmailJob = ({
  invitedEmail,
  workspaceName,
  inviterFullName,
  roleLabel,
  encryptedInviteToken,
  now = new Date(),
}: {
  invitedEmail: string;
  workspaceName: string;
  inviterFullName: string;
  roleLabel: string;
  encryptedInviteToken: string;
  now?: Date;
}): WorkspaceInvitationEmailJob => ({
  jobId: randomBytes(16).toString("hex"),
  createdAt: now.toISOString(),
  nextAttemptAt: now.toISOString(),
  attempts: 0,
  maxAttempts: 4,
  invitedEmail,
  workspaceName,
  inviterFullName,
  roleLabel,
  encryptedInviteToken,
});

export const enqueueWorkspaceInvitationEmailJob = async ({
  job,
  queueFilePath = defaultWorkspaceInvitationEmailQueueFilePath(),
}: {
  job: WorkspaceInvitationEmailJob;
  queueFilePath?: string;
}) =>
  withWorkspaceInvitationEmailQueueLock({
    queueFilePath,
    operation: async () => {
      const jobs = await readWorkspaceInvitationEmailJobs({ queueFilePath });
      jobs.push(job);
      await writeWorkspaceInvitationEmailJobs({ queueFilePath, jobs });
    },
  });

export const dequeueDueWorkspaceInvitationEmailJobs = async ({
  now = new Date(),
  limit = 10,
  queueFilePath = defaultWorkspaceInvitationEmailQueueFilePath(),
}: {
  now?: Date;
  limit?: number;
  queueFilePath?: string;
}) =>
  withWorkspaceInvitationEmailQueueLock({
    queueFilePath,
    operation: async () => {
      const jobs = await readWorkspaceInvitationEmailJobs({ queueFilePath });
      const dueJobs: WorkspaceInvitationEmailJob[] = [];
      const pendingJobs: WorkspaceInvitationEmailJob[] = [];
      const nowTime = now.getTime();

      for (const job of jobs) {
        const isDue = new Date(job.nextAttemptAt).getTime() <= nowTime;

        if (isDue && dueJobs.length < limit) {
          dueJobs.push(job);
          continue;
        }

        pendingJobs.push(job);
      }

      if (dueJobs.length > 0) {
        await writeWorkspaceInvitationEmailJobs({
          queueFilePath,
          jobs: pendingJobs,
        });
      }

      return dueJobs;
    },
  });
