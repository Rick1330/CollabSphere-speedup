/**
 * Verifies the DOCX import bind mount between host and Docker worker.
 * Usage: pnpm exec tsx scripts/verify-docx-mount.mts
 *
 * Requires collabsphere-worker container running (pnpm dev with DEV_WORKER_DOCKER=1).
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const workerComposeFile = join(rootDir, "docker-compose.worker.yml");
const containerPath = "/tmp/collabsphere-docx-imports";

const parseEnvFile = (filePath: string): Record<string, string> => {
  if (!existsSync(filePath)) return {};
  const parsed: Record<string, string> = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    parsed[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return parsed;
};

const resolveHostTmpDir = (): string => {
  const env = parseEnvFile(join(rootDir, ".env"));
  const raw =
    env.DOCX_IMPORT_TMP_DIR?.trim() ||
    env.DOCX_IMPORT_HOST_PATH?.trim() ||
    join(".tmp", "collabsphere-docx-imports");
  return isAbsolute(raw) ? resolve(raw) : resolve(rootDir, raw);
};

const toDockerBindSourcePath = (p: string) =>
  process.platform === "win32" ? p.replace(/\\/g, "/") : p;

const hostTmpDir = resolveHostTmpDir();
mkdirSync(hostTmpDir, { recursive: true });

const composeEnv = {
  ...process.env,
  ...parseEnvFile(join(rootDir, ".env")),
  DOCX_IMPORT_HOST_PATH: toDockerBindSourcePath(hostTmpDir),
};

const markerName = `.mount-check-${Date.now()}`;
const hostMarkerPath = join(hostTmpDir, markerName);
const containerMarkerPath = `${containerPath}/${markerName}`;

console.log(`[verify-docx-mount] host dir: ${hostTmpDir}`);
console.log(`[verify-docx-mount] compose bind source: ${composeEnv.DOCX_IMPORT_HOST_PATH}`);

const running = spawnSync(
  "docker",
  ["compose", "-f", workerComposeFile, "ps", "-q", "worker"],
  { cwd: rootDir, env: composeEnv, encoding: "utf8", windowsHide: true },
);

if (!running.stdout?.trim()) {
  console.error(
    "[verify-docx-mount] FAIL: worker container is not running.\n" +
      "  Start with: pnpm dev (DEV_WORKER_DOCKER=1) or docker compose -f docker-compose.worker.yml up -d",
  );
  process.exit(1);
}

writeFileSync(hostMarkerPath, "mount-check", "utf8");

const test = spawnSync(
  "docker",
  [
    "compose",
    "-f",
    workerComposeFile,
    "exec",
    "-T",
    "worker",
    "test",
    "-f",
    containerMarkerPath,
  ],
  { cwd: rootDir, env: composeEnv, encoding: "utf8", windowsHide: true },
);

try {
  unlinkSync(hostMarkerPath);
} catch {
  /* ignore */
}

if (test.status === 0) {
  console.log("[verify-docx-mount] PASS: host file visible inside collabsphere-worker");
  process.exit(0);
}

const detail = `${test.stdout ?? ""}${test.stderr ?? ""}`.trim();
console.error(
  "[verify-docx-mount] FAIL: bind mount broken.\n" +
    `  Host: ${hostMarkerPath}\n` +
    `  Container: ${containerMarkerPath}\n` +
    (process.platform === "win32"
      ? "  Enable D: (or your drive) in Docker Desktop → Settings → Resources → File sharing\n"
      : "") +
    "  Ensure DOCX_IMPORT_TMP_DIR and DOCX_IMPORT_HOST_PATH match in .env\n" +
    (detail ? `  docker exec: ${detail.slice(0, 400)}` : ""),
);
process.exit(1);
