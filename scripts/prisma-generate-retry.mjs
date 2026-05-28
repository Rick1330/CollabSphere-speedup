import { existsSync, renameSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const maxAttempts = 3;

const runGenerate = () =>
  spawnSync("prisma", ["generate"], {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32",
  });

const extractLockedEnginePath = (output) => {
  const match = output.match(/'([^']*query_engine-windows\.dll\.node(?:\.tmp\d+)?)'\s*->\s*'([^']*query_engine-windows\.dll\.node)'/i);
  if (!match) {
    return null;
  }
  return match[2];
};

const tryUnlockEngine = (enginePath) => {
  if (!enginePath || !existsSync(enginePath)) {
    return null;
  }
  const backupPath = `${enginePath}.bak-${Date.now()}`;
  renameSync(enginePath, backupPath);
  return backupPath;
};

let backupPath = null;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const result = runGenerate();
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (stdout) {
    process.stdout.write(stdout);
  }
  if (stderr) {
    process.stderr.write(stderr);
  }

  if (result.status === 0) {
    if (backupPath && existsSync(backupPath)) {
      try {
        rmSync(backupPath, { force: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(
          `[prisma-generate-retry] Prisma generate succeeded; could not remove engine backup (safe to delete manually): ${message}\n`,
        );
      }
    }
    process.exit(0);
  }

  const joinedOutput = `${stdout}\n${stderr}`;
  const enginePath = extractLockedEnginePath(joinedOutput);
  if (!joinedOutput.includes("EPERM") || !enginePath || attempt === maxAttempts) {
    process.exit(result.status ?? 1);
  }

  try {
    backupPath = tryUnlockEngine(enginePath);
    process.stderr.write(`[prisma-generate-retry] EPERM detected, retrying prisma generate (attempt ${attempt + 1}/${maxAttempts}).\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[prisma-generate-retry] Failed to unlock Prisma engine: ${message}\n`);
    process.exit(result.status ?? 1);
  }
}
