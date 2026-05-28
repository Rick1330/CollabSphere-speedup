import { execSync, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { assertDevPortContract } from "../packages/shared/src/dev-port-contract.ts";
import {
  checkComposeServicePort,
  collectForeignContainersForPorts,
  formatComposePortCheckFailure,
  stopDockerContainers,
} from "./lib/compose-port-check.mts";
import {
  checkMinioHostPort,
  formatMinioPortCheckFailure,
} from "./lib/minio-port-check.mts";

type EnvMap = Record<string, string>;

const getErrorCode = (error: unknown): string | undefined => {
  if (error && typeof error === "object" && "code" in error) {
    const code = error.code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(scriptDir, "..");
const envExamplePath = join(rootDir, ".env.example");
const envPath = join(rootDir, ".env");
const envLocalPath = join(rootDir, ".env.local");
const workerEnvPath = join(rootDir, "apps", "worker", ".env.worker");
const composeFilePath = join(rootDir, "docker-compose.yml");
const workerComposeFilePath = join(rootDir, "docker-compose.worker.yml");
/** Long-running compose services; excludes one-shot minio-setup (use `run --rm` instead). */
const COMPOSE_WAIT_SERVICES = ["postgres", "redis", "mailhog", "minio"] as const;
const POSTGRES_CONTAINER = "collabsphere-postgres";
const windowsTaskkillPath = String.raw`C:\Windows\System32\taskkill.exe`;
const envKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

const portEnvKeys = new Set([
  "POSTGRES_PORT",
  "REDIS_PORT",
  "MAILHOG_SMTP_PORT",
  "MAILHOG_UI_PORT",
  "MINIO_API_PORT",
  "MINIO_CONSOLE_PORT"
]);

const ttlEnvKeys = new Set([
  "JWT_ACCESS_TTL_MINUTES",
  "REFRESH_TOKEN_TTL_DAYS"
]);

const urlEnvKeys = new Set([
  "DATABASE_URL",
  "REDIS_URL",
  "API_BASE_URL",
  "BASE_URL",
  "COLLAB_DATABASE_URL",
  "COLLAB_REDIS_URL",
  "COLLAB_WS_URL",
  "S3_ENDPOINT"
]);

/** API first so port 3001 is bound before collab; web/collab/worker follow. */
const appSurfaces = [
  {
    label: "api",
    filter: "@collabsphere/api",
    packageJsonPath: join(rootDir, "apps", "api", "package.json")
  },
  {
    label: "web",
    filter: "@collabsphere/web",
    packageJsonPath: join(rootDir, "apps", "web", "package.json")
  },
  {
    label: "collab",
    filter: "@collabsphere/collab",
    packageJsonPath: join(rootDir, "apps", "collab", "package.json")
  },
  {
    label: "worker",
    filter: "@collabsphere/worker",
    packageJsonPath: join(rootDir, "apps", "worker", "package.json")
  }
];

const logInfo = (message) => {
  console.log(`[dev] ${message}`);
};

const logWarn = (message) => {
  console.warn(`[dev] ${message}`);
};

const logError = (message) => {
  console.error(`[dev] ${message}`);
};

const exitWithHelp = (code = 0) => {
  console.log(`Usage: pnpm dev [--skip-compose] [--stop-conflicting] [--build-worker]

Options:
  --skip-compose        Reuse existing Docker services and skip docker compose startup.
  --stop-conflicting    Stop foreign containers on compose dev ports before compose up.
  --build-worker        Rebuild the Docker worker image before starting (slow; use after Dockerfile changes).
  --help                Show this help text.
`);
  process.exit(code);
};

const parseArgs = (argv) => {
  let skipCompose = false;
  let stopConflicting = false;
  let buildWorker = false;

  for (const arg of argv) {
    if (arg === "--") {
      continue;
    }

    if (arg === "--skip-compose") {
      skipCompose = true;
      continue;
    }

    if (arg === "--stop-conflicting") {
      stopConflicting = true;
      continue;
    }

    if (arg === "--build-worker") {
      buildWorker = true;
      continue;
    }

    if (arg === "--help") {
      exitWithHelp(0);
    }

    throw new Error(`Unknown argument "${arg}". Use --help for supported options.`);
  }

  if (!buildWorker) {
    const envFlag = process.env.DEV_WORKER_BUILD?.trim().toLowerCase();
    buildWorker = envFlag === "1" || envFlag === "true" || envFlag === "yes";
  }

  return { skipCompose, stopConflicting, buildWorker };
};

const hasWrappedQuote = (value, quote) => value.startsWith(quote) && value.endsWith(quote);

const unquoteEnvValue = (value) => {
  for (const quote of ["\"", "'"]) {
    if (hasWrappedQuote(value, quote)) {
      return value.slice(1, -1);
    }
  }

  return value;
};

const skipLeadingSpaceOrTab = (value, startIndex) => {
  let index = startIndex;

  while (index < value.length) {
    const char = value[index];

    if (char !== " " && char !== "\t") {
      break;
    }

    index += 1;
  }

  return index;
};

const parseEnvAssignment = (rawLine, lineNumber, label) => {
  const line = rawLine.trim();

  if (!line || line.startsWith("#")) {
    return null;
  }

  const separatorIndex = rawLine.indexOf("=");

  if (separatorIndex <= 0) {
    throw new Error(`${label} has an invalid assignment on line ${lineNumber}.`);
  }

  const key = rawLine.slice(0, separatorIndex).trim();
  const valueStart = skipLeadingSpaceOrTab(rawLine, separatorIndex + 1);
  const value = rawLine.slice(valueStart);

  if (!envKeyPattern.test(key)) {
    throw new Error(`${label} has an invalid assignment on line ${lineNumber}.`);
  }

  return [key, unquoteEnvValue(value)];
};

const parseEnvFile = (filePath: string, label: string): EnvMap => {
  const content = readFileSync(filePath, "utf8");
  const values: EnvMap = {};
  const lines = content.split(/\r?\n/);

  for (const [index, rawLine] of lines.entries()) {
    const assignment = parseEnvAssignment(rawLine, index + 1, label);

    if (!assignment) {
      continue;
    }

    const [key, value] = assignment;
    values[key] = value;
  }

  return values;
};

const hasValue = (value) => typeof value === "string" && value.trim().length > 0;

const parsePositiveIntegerValue = (key, value) => {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${key} must be a positive integer in .env or .env.local.`);
  }

  const parsed = Number.parseInt(value, 10);

  if (parsed <= 0) {
    throw new Error(`${key} must be a positive integer in .env or .env.local.`);
  }

  return parsed;
};

const validateIntegerValue = (key, value) => {
  parsePositiveIntegerValue(key, value);
};

const validatePortValue = (key, value) => {
  const parsed = parsePositiveIntegerValue(key, value);

  if (parsed > 65535) {
    throw new Error(`${key} must be between 1 and 65535 in .env or .env.local.`);
  }
};

const validateUrlValue = (key, value) => {
  try {
    new URL(value);
  } catch {
    throw new Error(`${key} must be a valid absolute URL in .env or .env.local.`);
  }
};

const validateCorsOrigins = (value) => {
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGINS must include at least one origin.");
  }

  for (const origin of origins) {
    try {
      new URL(origin);
    } catch {
      throw new Error(`CORS_ORIGINS contains an invalid origin "${origin}".`);
    }
  }
};

const ensureRequiredEnvFiles = () => {
  if (!existsSync(envExamplePath)) {
    throw new Error("Missing .env.example; cannot validate local startup configuration.");
  }

  if (!existsSync(envPath)) {
    throw new Error("Missing .env. Copy .env.example to .env before running pnpm dev.");
  }
};

const loadEnvSources = () => ({
  exampleValues: parseEnvFile(envExamplePath, ".env.example"),
  envValues: parseEnvFile(envPath, ".env"),
  envLocalValues: existsSync(envLocalPath) ? parseEnvFile(envLocalPath, ".env.local") : ({} as EnvMap),
  workerEnvValues: existsSync(workerEnvPath)
    ? parseEnvFile(workerEnvPath, "apps/worker/.env.worker")
    : ({} as EnvMap),
});

const validateRequiredKeys = (exampleValues, localValues) => {
  const missingKeys = Object.keys(exampleValues).filter((key) => !hasValue(localValues[key]));

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required local environment keys: ${missingKeys.join(", ")}. ` +
        "Use .env.example as the reference and keep .env in sync."
    );
  }
};

const validateKnownEnvValues = (values) => {
  for (const [key, value] of Object.entries(values)) {
    if (!hasValue(value)) {
      continue;
    }

    if (portEnvKeys.has(key)) {
      validatePortValue(key, value);
    }

    if (ttlEnvKeys.has(key)) {
      validateIntegerValue(key, value);
    }

    if (urlEnvKeys.has(key)) {
      validateUrlValue(key, value);
    }

    if (key === "CORS_ORIGINS") {
      validateCorsOrigins(value);
    }
  }
};

const createLocalEmailEnv = (values: EnvMap): EnvMap => {
  const env: EnvMap = {};
  const host = hasValue(values.EMAIL_SMTP_HOST) ? values.EMAIL_SMTP_HOST : "127.0.0.1";

  if (hasValue(values.EMAIL_SMTP_PORT)) {
    validatePortValue("EMAIL_SMTP_PORT", values.EMAIL_SMTP_PORT);
    env.EMAIL_SMTP_HOST = host;
    env.EMAIL_SMTP_PORT = values.EMAIL_SMTP_PORT;
    return env;
  }

  if (hasValue(values.MAILHOG_SMTP_PORT)) {
    validatePortValue("MAILHOG_SMTP_PORT", values.MAILHOG_SMTP_PORT);
    env.EMAIL_SMTP_HOST = host;
    env.EMAIL_SMTP_PORT = values.MAILHOG_SMTP_PORT;
    return env;
  }

  return env;
};

const findListeningPid = (port) => {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr ":${port}"`, {
        encoding: "utf8",
        windowsHide: true
      });
      for (const line of output.split(/\r?\n/)) {
        if (!line.includes("LISTENING")) {
          continue;
        }
        const parts = line.trim().split(/\s+/);
        const pid = Number.parseInt(parts[parts.length - 1] ?? "", 10);
        if (Number.isFinite(pid) && pid > 0) {
          return pid;
        }
      }
      return null;
    }

    const output = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN`, {
      encoding: "utf8"
    });
    const match = output.match(/\n(\d+)\s/);
    return match ? Number.parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
};

const formatPortInUseHelp = (port, label = "PORT") => {
  const pid = findListeningPid(port);
  const killHint =
    process.platform === "win32"
      ? pid
        ? ` Stop it with: taskkill /PID ${pid} /F`
        : " Run: netstat -ano | findstr :" +
          port +
          " then taskkill /PID <pid> /F"
      : pid
        ? ` Stop it with: kill ${pid}`
        : ` Run: lsof -nP -iTCP:${port} -sTCP:LISTEN`;
  return `${label} ${port} is already in use.${killHint}`;
};

const assertListenPortAvailable = (port, label = "PORT", host = "0.0.0.0") =>
  new Promise<void>((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", (error) => {
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (code === "EADDRINUSE") {
        reject(new Error(formatPortInUseHelp(port, label)));
        return;
      }
      reject(error);
    });
    probe.once("listening", () => {
      probe.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve();
      });
    });
    probe.listen(port, host);
  });

const loadValidatedEnv = () => {
  ensureRequiredEnvFiles();
  const { exampleValues, envValues, envLocalValues, workerEnvValues } = loadEnvSources();
  const appLocalValues = {
    ...envValues,
    ...envLocalValues
  };

  validateRequiredKeys(exampleValues, appLocalValues);
  validateKnownEnvValues(envValues);
  validateKnownEnvValues(appLocalValues);

  const apiPort = Number.parseInt(appLocalValues.PORT ?? "3001", 10) || 3001;

  assertDevPortContract({
    PORT: appLocalValues.PORT,
    API_BASE_URL: appLocalValues.API_BASE_URL,
    BASE_URL: appLocalValues.BASE_URL,
    WEB_APP_URL: appLocalValues.WEB_APP_URL,
    CORS_ORIGINS: appLocalValues.CORS_ORIGINS,
    COLLAB_WS_URL: appLocalValues.COLLAB_WS_URL,
  });

  const googleClientId = appLocalValues.GOOGLE_CLIENT_ID?.trim() ?? "";
  if (!googleClientId || googleClientId === "local-dev-disabled") {
    logWarn(
      "Google OAuth disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local (see .env.local.example).",
    );
  }

  const docxImportPaths = resolveDocxImportPaths(appLocalValues);
  const workerDocker = isDevWorkerDocker(appLocalValues);

  warnIfMinioCredentialsMismatch(appLocalValues);

  return {
    apiPort,
    workerDocker,
    docxImportPaths,
    // Compose follows repo-local .env, while app children can layer runtime-only .env.local overrides.
    composeEnv: {
      ...process.env,
      ...envValues,
      DOCX_IMPORT_HOST_PATH: toDockerBindSourcePath(docxImportPaths.hostPath),
    },
    appEnv: {
      ...process.env,
      ...appLocalValues,
      ...createLocalEmailEnv(appLocalValues),
      DOCX_IMPORT_TMP_DIR: docxImportPaths.tmpDir,
      DOCX_IMPORT_HOST_PATH: docxImportPaths.hostPath,
    },
    workerEnvValues,
  };
};

const getRunnableDevScript = (manifest) => {
  if (!manifest.scripts) {
    return null;
  }

  if (typeof manifest.scripts.dev !== "string") {
    return null;
  }

  const devScript = manifest.scripts.dev.trim();
  return devScript || null;
};

const isDevWorkerDocker = (values: EnvMap) => {
  const flag = values.DEV_WORKER_DOCKER?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
};

const COMPOSE_HOST_PORTS: Array<{
  envKey: string;
  defaultPort: number;
  container: string;
  label: string;
}> = [
  { envKey: "REDIS_PORT", defaultPort: 6379, container: "collabsphere-redis", label: "redis" },
  {
    envKey: "POSTGRES_PORT",
    defaultPort: 5432,
    container: "collabsphere-postgres",
    label: "postgres",
  },
  { envKey: "MINIO_API_PORT", defaultPort: 9000, container: "collabsphere-minio", label: "minio" },
  {
    envKey: "MINIO_CONSOLE_PORT",
    defaultPort: 9001,
    container: "collabsphere-minio",
    label: "minio-console",
  },
  {
    envKey: "MAILHOG_SMTP_PORT",
    defaultPort: 1025,
    container: "collabsphere-mailhog",
    label: "mailhog-smtp",
  },
  {
    envKey: "MAILHOG_UI_PORT",
    defaultPort: 8025,
    container: "collabsphere-mailhog",
    label: "mailhog-ui",
  },
];

const resolveHostPort = (values: EnvMap, envKey: string, defaultPort: number) =>
  Number.parseInt(values[envKey] ?? String(defaultPort), 10) || defaultPort;

const buildComposePortChecks = (values: EnvMap) =>
  COMPOSE_HOST_PORTS.map(({ envKey, defaultPort, container }) => ({
    hostPort: resolveHostPort(values, envKey, defaultPort),
    expectedContainer: container,
  }));

const formatDevComposePortList = (values: EnvMap) =>
  [...new Set(buildComposePortChecks(values).map((check) => check.hostPort))]
    .sort((left, right) => left - right)
    .join(", ");

const stopForeignContainersOnDevPorts = async (values: EnvMap) => {
  const foreign = collectForeignContainersForPorts(buildComposePortChecks(values));
  const portList = formatDevComposePortList(values);

  if (foreign.length === 0) {
    logInfo(`no conflicting containers on dev ports (${portList})`);
    return;
  }

  logInfo(`stopping ${foreign.length} conflicting container(s): ${foreign.join(", ")}`);
  stopDockerContainers(foreign, (message) => logInfo(message));
  await sleep(1_000);
};

const assertComposePortsBeforeUp = (values: EnvMap) => {
  const failures: string[] = [];

  for (const { envKey, defaultPort, container, label } of COMPOSE_HOST_PORTS) {
    const hostPort = resolveHostPort(values, envKey, defaultPort);
    const result = checkComposeServicePort(hostPort, container, label);
    if (!result.ok && result.hint) {
      failures.push(result.hint);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      "Docker Compose cannot bind required ports:\n" +
        failures.map((hint) => `  - ${hint}`).join("\n") +
        "\nStop the conflicting containers, run `pnpm dev --stop-conflicting`, " +
        "or use `pnpm dev --skip-compose` if this project's stack is already up.",
    );
  }
};

const assertCollabsphereMinioHostPort = (values: EnvMap) => {
  if ((values.STORAGE_TYPE ?? "").trim().toLowerCase() !== "s3") {
    return;
  }

  const hostPort = resolveHostPort(values, "MINIO_API_PORT", 9000);
  const result = checkMinioHostPort(hostPort, true);
  if (!result.ok) {
    throw new Error(formatMinioPortCheckFailure(result));
  }
};

const warnIfMinioCredentialsMismatch = (values: EnvMap) => {
  if ((values.STORAGE_TYPE ?? "").trim().toLowerCase() !== "s3") {
    return;
  }

  const s3AccessKey =
    values.S3_ACCESS_KEY_ID?.trim() ||
    values.AWS_ACCESS_KEY_ID?.trim() ||
    values.MINIO_ACCESS_KEY?.trim() ||
    "";
  const minioRootUser = values.MINIO_ROOT_USER?.trim() ?? "";

  if (s3AccessKey && minioRootUser && s3AccessKey !== minioRootUser) {
    logWarn(
      `S3_ACCESS_KEY_ID (${s3AccessKey}) does not match MINIO_ROOT_USER (${minioRootUser}). ` +
        "MinIO uses the root user as the S3 access key — align both in .env or match the running container. " +
        "Run: pnpm diagnose:minio",
    );
  }
};

const resolvePathFromRepoRoot = (rawPath: string) =>
  isAbsolute(rawPath) ? resolve(rawPath) : resolve(rootDir, rawPath);

const resolveDocxImportPaths = (values: EnvMap) => {
  const defaultRelative = join(".tmp", "collabsphere-docx-imports");
  const tmpDir = values.DOCX_IMPORT_TMP_DIR?.trim()
    ? resolvePathFromRepoRoot(values.DOCX_IMPORT_TMP_DIR)
    : resolve(rootDir, defaultRelative);
  const hostPath = values.DOCX_IMPORT_HOST_PATH?.trim()
    ? resolvePathFromRepoRoot(values.DOCX_IMPORT_HOST_PATH)
    : tmpDir;

  mkdirSync(tmpDir, { recursive: true });
  return { tmpDir, hostPath };
};

/** Docker Compose on Windows expects forward slashes in bind mount sources. */
const toDockerBindSourcePath = (absoluteHostPath: string) => {
  if (process.platform === "win32") {
    return absoluteHostPath.replace(/\\/g, "/");
  }
  return absoluteHostPath;
};

const DOCX_MOUNT_CONTAINER_PATH = "/tmp/collabsphere-docx-imports";

const verifyDocxImportDockerMount = async (
  composeEnv: NodeJS.ProcessEnv,
  hostTmpDir: string,
) => {
  const markerName = `.mount-check-${Date.now()}`;
  const hostMarkerPath = join(hostTmpDir, markerName);
  const containerMarkerPath = `${DOCX_MOUNT_CONTAINER_PATH}/${markerName}`;

  writeFileSync(hostMarkerPath, "mount-check", "utf8");

  try {
    const result = spawnSync(
      "docker",
      [
        "compose",
        "-f",
        workerComposeFilePath,
        "exec",
        "-T",
        "worker",
        "test",
        "-f",
        containerMarkerPath,
      ],
      {
        cwd: rootDir,
        env: composeEnv,
        encoding: "utf8",
        windowsHide: true,
      },
    );

    if (result.status !== 0) {
      const execDetail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
      throw new Error(
        "DOCX import bind mount is not visible inside the Docker worker.\n" +
          `- Host folder: ${hostTmpDir}\n` +
          `- Container path: ${DOCX_MOUNT_CONTAINER_PATH}\n` +
          (process.platform === "win32"
            ? "- Enable the drive (e.g. D:) in Docker Desktop → Settings → Resources → File sharing\n"
            : "") +
          "- Ensure .env sets DOCX_IMPORT_TMP_DIR and DOCX_IMPORT_HOST_PATH to the same folder\n" +
          "- Inspect mounts: docker compose -f docker-compose.worker.yml config\n" +
          "- Manual check: docker exec collabsphere-worker ls -la " +
          DOCX_MOUNT_CONTAINER_PATH +
          (execDetail ? `\n- exec test: ${execDetail.slice(0, 300)}` : ""),
      );
    }

    logInfo("DOCX import Docker bind mount verified");
  } finally {
    try {
      unlinkSync(hostMarkerPath);
    } catch {
      /* best-effort cleanup */
    }
  }
};

const DEFAULT_WIN_LIBREOFFICE_PATH =
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe";

const WIN_LIBREOFFICE_X86_PATH =
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe";

const findVersionedWindowsLibreOfficePaths = (): string[] => {
  if (process.platform !== "win32") {
    return [];
  }

  const bases = ["C:\\Program Files", "C:\\Program Files (x86)"];
  const results: string[] = [];

  for (const base of bases) {
    try {
      const dirs = readdirSync(base, { withFileTypes: true });
      for (const dir of dirs) {
        if (!dir.isDirectory() || !dir.name.startsWith("LibreOffice")) {
          continue;
        }
        const candidate = join(base, dir.name, "program", "soffice.exe");
        if (existsSync(candidate)) {
          results.push(candidate);
        }
      }
    } catch {
      /* try next base */
    }
  }

  return results;
};

const listLibreOfficeCandidates = (appEnv: EnvMap): string[] => {
  const configured = appEnv.LIBREOFFICE_PATH?.trim();
  const defaults =
    process.platform === "win32"
      ? [
          DEFAULT_WIN_LIBREOFFICE_PATH,
          WIN_LIBREOFFICE_X86_PATH,
          ...findVersionedWindowsLibreOfficePaths(),
          "soffice.exe",
        ]
      : [
          "/usr/bin/libreoffice",
          "/usr/bin/soffice",
          "/Applications/LibreOffice.app/Contents/MacOS/soffice",
          "libreoffice",
          "soffice",
        ];

  const candidates = [configured, ...defaults].filter(
    (candidate): candidate is string => Boolean(candidate?.trim()),
  );

  return [...new Set(candidates)];
};

const libreOfficeVersionOutputLooksValid = (stdout: string, stderr: string): boolean =>
  /LibreOffice|OpenOffice|Version\s+\d/i.test(`${stdout}\n${stderr}`);

const probeLibreOfficeBinary = (bin: string) => {
  const result = spawnSync(bin, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 5_000,
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  const spawnCode =
    result.error && typeof result.error === "object" && "code" in result.error
      ? String((result.error as { code?: string }).code)
      : "";

  if (result.status === 0 && !result.error) {
    return { ok: true as const, bin, detail: output };
  }

  if (!result.error && libreOfficeVersionOutputLooksValid(result.stdout ?? "", result.stderr ?? "")) {
    return { ok: true as const, bin, detail: output };
  }

  if (!result.error && spawnCode !== "ENOENT" && existsSync(bin)) {
    return { ok: true as const, bin, detail: output || "(no version output; binary exists)" };
  }

  return {
    ok: false as const,
    bin,
    detail:
      output ||
      (result.error instanceof Error ? result.error.message : "") ||
      `exit ${result.status ?? "unknown"} signal ${result.signal ?? "none"}`,
  };
};

const assertLibreOfficeForHostWorker = (appEnv: EnvMap): string => {
  const candidates = listLibreOfficeCandidates(appEnv);
  const failures: string[] = [];
  let existingWithoutVersionProbe: string | null = null;

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    const probe = probeLibreOfficeBinary(candidate);
    if (probe.ok) {
      if (probe.detail && !libreOfficeVersionOutputLooksValid(probe.detail, "")) {
        logWarn(
          `LibreOffice at ${candidate} did not report a clear version string; continuing because the binary exists.`,
        );
      }
      return candidate;
    }

    failures.push(`${candidate}: ${probe.detail}`);
    existingWithoutVersionProbe ??= candidate;
  }

  if (existingWithoutVersionProbe) {
    logWarn(
      `LibreOffice --version probe failed for all candidates; continuing with ${existingWithoutVersionProbe} because the file exists (worker will retry at runtime).`,
    );
    return existingWithoutVersionProbe;
  }

  throw new Error(
    "LibreOffice is required for DOCX import with host worker (DEV_WORKER_DOCKER=0).\n" +
      `- Tried: ${candidates.join(", ") || "(none)"}\n` +
      (process.platform === "win32"
        ? "- Install: winget install TheDocumentFoundation.LibreOffice\n" +
          `- Then set LIBREOFFICE_PATH=${DEFAULT_WIN_LIBREOFFICE_PATH} in .env\n`
        : "- Install LibreOffice and set LIBREOFFICE_PATH in .env\n") +
      (failures.length > 0 ? `- Details:\n  ${failures.join("\n  ").slice(0, 800)}` : ""),
  );
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isDockerWorkerContainerRunning = () => {
  const byName = spawnSync("docker", ["ps", "-q", "--filter", "name=collabsphere-worker"], {
    encoding: "utf8",
    windowsHide: true,
  });
  return Boolean(byName.stdout?.trim());
};

const ensureDockerWorkerStopped = async (composeEnv: NodeJS.ProcessEnv) => {
  if (existsSync(workerComposeFilePath) && isDockerWorkerContainerRunning()) {
    try {
      await runCommand(
        "docker",
        ["compose", "-f", workerComposeFilePath, "stop", "worker"],
        {
          cwd: rootDir,
          env: composeEnv,
        },
      );
    } catch (error) {
      logWarn(
        `could not stop Docker worker service: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const removed = spawnSync("docker", ["rm", "-f", "collabsphere-worker"], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (removed.status === 0 && removed.stdout?.trim()) {
    logInfo("removed Docker worker container collabsphere-worker (host worker mode)");
  } else if (!isDockerWorkerContainerRunning()) {
    logInfo("no Docker worker container running (host worker mode)");
  }

  if (isDockerWorkerContainerRunning()) {
    throw new Error(
      "Docker worker container collabsphere-worker is still running. " +
        "Stop it with: docker rm -f collabsphere-worker",
    );
  }
};

const assertHostWorkerProcessAlive = async (child: ReturnType<typeof spawn> | undefined) => {
  if (!child) {
    throw new Error("Host worker process was not started by pnpm dev.");
  }

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Host worker exited during startup (code ${child.exitCode}). ` +
          "Check the worker output above for MinIO, LibreOffice, Redis, or database errors.",
      );
    }
    await sleep(500);
  }

  if (child.exitCode !== null) {
    throw new Error(
      `Host worker exited during startup (code ${child.exitCode}). ` +
        "Check the worker output above for MinIO, LibreOffice, Redis, or database errors.",
    );
  }
};

const ensureAppSurfaces = (surfaces = appSurfaces) => {
  for (const surface of surfaces) {
    if (!existsSync(surface.packageJsonPath)) {
      throw new Error(`Missing package manifest for ${surface.label}: ${surface.packageJsonPath}`);
    }

    const manifest = JSON.parse(readFileSync(surface.packageJsonPath, "utf8"));

    if (!getRunnableDevScript(manifest)) {
      throw new Error(`Package ${surface.filter} is missing a runnable scripts.dev entry.`);
    }
  }
};

const resolvePnpmRunner = () => {
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath && basename(npmExecPath).toLowerCase().includes("pnpm")) {
    return {
      command: process.execPath,
      baseArgs: [npmExecPath]
    };
  }

  return {
    command: process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    baseArgs: []
  };
};

const terminateChild = (child, label) =>
  new Promise<void>((resolve) => {
    if (child?.exitCode !== null || child?.signalCode !== null) {
      resolve();
      return;
    }

    const finish = () => resolve();
    child.once("exit", finish);

    if (process.platform === "win32") {
      const killer = spawn(windowsTaskkillPath, ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true
      });

      killer.once("error", () => {
        logWarn(`failed to terminate ${label} with taskkill; waiting for it to exit`);
      });

      killer.once("exit", () => {
        setTimeout(resolve, 50);
      });
      return;
    }

    child.kill("SIGTERM");

    const forceKillTimer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }, 3000);

    child.once("exit", () => {
      clearTimeout(forceKillTimer);
      resolve();
    });
  });

const assertApiPortNotAlreadyServing = async (apiPort) => {
  const healthUrl = `http://127.0.0.1:${apiPort}/api/v1/health`;
  try {
    const res = await fetch(healthUrl, { method: "GET" });
    if (!res.ok) {
      return;
    }

    const pid = findListeningPid(apiPort);
    throw new Error(
      `Port ${apiPort} already serves the API (${healthUrl} → ${res.status}) before this dev session started.` +
        " Only one API may run on that port." +
        (pid
          ? ` Listening PID: ${pid}.${process.platform === "win32" ? ` Stop it: taskkill /PID ${pid} /F` : ` Stop it: kill ${pid}`}`
          : ""),
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("before this dev session")) {
      throw error;
    }
    /* connection refused / not ready — expected */
  }
};

const waitForHttpOk = async (url, timeoutMs = 90_000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        return;
      }
    } catch {
      /* API still starting */
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const envForSurface = (surface, appEnv, workerEnvValues) => {
  if (surface.label === "worker") {
    return {
      ...appEnv,
      ...workerEnvValues,
    };
  }

  if (surface.label !== "collab") {
    return appEnv;
  }
  const { PORT: _apiPort, ...rest } = appEnv;
  return {
    ...rest,
    NODE_ENV: rest.NODE_ENV ?? "development",
    COLLAB_PORT: appEnv.COLLAB_PORT ?? "3002",
  };
};

const probeDockerEngine = () => {
  const version = spawnSync("docker", ["version", "--format", "{{json .}}"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const versionText = `${version.stdout ?? ""}${version.stderr ?? ""}`.trim();
  const server500 = /500 Internal Server Error/i.test(versionText);
  const enginePipe = /dockerDesktopLinuxEngine/i.test(versionText);

  return { server500, enginePipe, versionText };
};

const assertDockerEngineHealthy = () => {
  const probe = probeDockerEngine();
  if (!probe.server500) {
    return;
  }

  throw new Error(
    "Docker Desktop Linux engine is not responding (HTTP 500 on dockerDesktopLinuxEngine). " +
      "Restart Docker Desktop and wait until it shows Running, then run `pnpm dev` again. " +
      "If Postgres and Redis are already running locally, use `pnpm dev --skip-compose` instead.",
  );
};

const captureCommandOutput = (
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    windowsHide: true,
    cwd: options?.cwd,
    env: options?.env,
  });
  return `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
};

const getPostgresHealthStatus = (): string | null => {
  const status = captureCommandOutput("docker", [
    "inspect",
    "-f",
    "{{.State.Health.Status}}",
    POSTGRES_CONTAINER,
  ]);
  if (!status || /error|no such/i.test(status)) {
    return null;
  }
  return status;
};

const waitForPostgresHealthy = async (appEnv: EnvMap, timeoutMs = 90_000) => {
  const user = appEnv.POSTGRES_USER ?? "collab";
  const db = appEnv.POSTGRES_DB ?? "collabsphere";
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (getPostgresHealthStatus() === "healthy") {
      return;
    }

    const ready = spawnSync(
      "docker",
      ["exec", POSTGRES_CONTAINER, "pg_isready", "-U", user, "-d", db],
      { encoding: "utf8", windowsHide: true },
    );
    if (ready.status === 0) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
  }

  throw new Error(
    `Postgres did not become healthy within ${timeoutMs / 1000}s.\n` +
      `Run: docker logs ${POSTGRES_CONTAINER}\n` +
      "If you changed POSTGRES_USER/POSTGRES_PASSWORD in .env but kept an old volume, reset postgres_data:\n" +
      "  docker compose -f docker-compose.yml down\n" +
      "  docker volume ls   # find <project>_postgres_data, then: docker volume rm <name>",
  );
};

const formatComposeStartupFailure = (detail: string, appEnv: EnvMap) => {
  const portConflict = /port is already allocated/i.test(detail);
  const portHint = portConflict
    ? "\n[dev] A port is in use by another Docker container (often collabsphere-repo-*). " +
      `Run \`pnpm dev --stop-conflicting\`, or \`docker ps\` and stop containers on ${formatDevComposePortList(appEnv)}, ` +
      "or use `pnpm dev --skip-compose`."
    : "";

  const psOutput = captureCommandOutput("docker", ["compose", "-f", composeFilePath, "ps"], {
    cwd: rootDir,
  });
  const psHint = psOutput ? `\n[dev] docker compose ps:\n${psOutput}` : "";

  return (
    `${detail}${portHint}${psHint}\n` +
    `[dev] Check Postgres: docker logs ${POSTGRES_CONTAINER}\n` +
    "[dev] Docker Compose could not start dependencies. " +
    "Fix Docker Desktop (restart until `docker version` shows Server without errors), " +
    "or run `pnpm dev --skip-compose` if postgres/redis/mailhog/minio are already available."
  );
};

const ensureDockerComposeServices = async (
  composeEnv: NodeJS.ProcessEnv,
  appEnv: EnvMap,
) => {
  try {
    await runCommand(
      "docker",
      ["compose", "-f", composeFilePath, "up", "-d", "--wait", ...COMPOSE_WAIT_SERVICES],
      { cwd: rootDir, env: composeEnv },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(formatComposeStartupFailure(detail, appEnv));
  }

  await waitForPostgresHealthy(appEnv);
  await ensureDatabaseMigrations(appEnv);

  try {
    await runCommand(
      "docker",
      ["compose", "-f", composeFilePath, "--profile", "init", "run", "--rm", "minio-setup"],
      { cwd: rootDir, env: composeEnv },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${detail}\n` +
        "[dev] MinIO bucket setup failed. Ensure collabsphere-minio is healthy, then run:\n" +
        "  docker compose -f docker-compose.yml --profile init run --rm minio-setup\n" +
        "  docker logs collabsphere-minio",
    );
  }

  logInfo("MinIO buckets ensured");
};

const ensureDatabaseMigrations = async (appEnv: EnvMap) => {
  const pnpmRunner = resolvePnpmRunner();
  logInfo("applying database migrations (pnpm prisma migrate deploy)");
  try {
    await runCommand(pnpmRunner.command, [...pnpmRunner.baseArgs, "prisma", "migrate", "deploy"], {
      cwd: rootDir,
      env: { ...process.env, ...appEnv },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${detail}\n` +
        "[dev] Database migrations failed. Ensure Postgres is running and DATABASE_URL in .env matches compose credentials, then run:\n" +
        "  pnpm prisma migrate deploy\n" +
        `  docker logs ${POSTGRES_CONTAINER}`,
    );
  }
  logInfo("database migrations applied");
  await ensureSystemTemplatesSeeded(appEnv);
};

const ensureSystemTemplatesSeeded = async (appEnv: EnvMap) => {
  const pnpmRunner = resolvePnpmRunner();
  logInfo("seeding system templates (pnpm db:seed)");
  try {
    await runCommand(process.execPath, [join(scriptDir, "prisma-local.mjs"), "db", "seed"], {
      cwd: rootDir,
      env: { ...process.env, ...appEnv },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${detail}\n` +
        "[dev] System template seed failed. Ensure Postgres is reachable, then run:\n" +
        "  pnpm db:seed\n" +
        "Check DATABASE_URL in .env matches your Postgres instance.",
    );
  }
  logInfo("system templates seeded");
};

const runCommand = (command, args, options) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit",
      windowsHide: false
    });

    child.once("error", (error) => {
      if (getErrorCode(error) === "ENOENT") {
        reject(new Error(`Unable to find "${command}" on PATH.`));
        return;
      }

      reject(error);
    });

    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          signal
            ? `${command} ${args.join(" ")} exited due to signal ${signal}.`
            : `${command} ${args.join(" ")} exited with code ${code}.`
        )
      );
    });
  });

const isDockerWorkerRunning = (composeEnv: NodeJS.ProcessEnv) => {
  const result = spawnSync(
    "docker",
    ["compose", "-f", workerComposeFilePath, "ps", "-q", "worker"],
    {
      cwd: rootDir,
      env: composeEnv,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  return Boolean(result.stdout?.trim());
};

const main = async () => {
  const { skipCompose, stopConflicting, buildWorker } = parseArgs(process.argv.slice(2));

  if (!existsSync(composeFilePath) && !skipCompose) {
    throw new Error(`Missing docker-compose.yml at ${composeFilePath}`);
  }

  logInfo("validating local environment against .env.example");
  const { composeEnv, appEnv, apiPort, workerEnvValues, workerDocker, docxImportPaths } =
    loadValidatedEnv();
  const surfacesToStart = workerDocker
    ? appSurfaces.filter((surface) => surface.label !== "worker")
    : appSurfaces;
  ensureAppSurfaces(surfacesToStart);
  await assertListenPortAvailable(apiPort);
  const pnpmRunner = resolvePnpmRunner();
  const children = new Map();
  let shuttingDown = false;
  let settled = false;

  const finish = (exitCode) => {
    if (settled) {
      return;
    }

    settled = true;
    process.exit(exitCode);
  };

  const shutdown = async (reason, exitCode) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logInfo(reason);
    await Promise.allSettled(
      Array.from(children.entries(), ([label, child]) => terminateChild(child, label))
    );
    if (workerDocker && existsSync(workerComposeFilePath)) {
      await runCommand("docker", ["compose", "-f", workerComposeFilePath, "stop"], {
        cwd: rootDir,
        env: composeEnv,
      }).catch((error) => {
        logWarn(
          `failed to stop Docker worker: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
    finish(exitCode);
  };

  process.once("SIGINT", () => {
    void shutdown("received SIGINT, stopping app processes", 0);
  });

  process.once("SIGTERM", () => {
    void shutdown("received SIGTERM, stopping app processes", 0);
  });

  if (skipCompose) {
    logWarn("skipping docker compose startup because --skip-compose was provided");
    await ensureDatabaseMigrations(appEnv);
  } else {
    logInfo("ensuring docker compose services are up and healthy");
    assertDockerEngineHealthy();

    if (stopConflicting) {
      await stopForeignContainersOnDevPorts(appEnv);
    }

    assertComposePortsBeforeUp(appEnv);

    await ensureDockerComposeServices(composeEnv, appEnv);

    logInfo("docker compose services are ready");
  }

  assertCollabsphereMinioHostPort(appEnv);

  if (workerDocker) {
    logWarn(
      "DEV_WORKER_DOCKER=1 — using Docker worker. Set DEV_WORKER_DOCKER=0 for host worker + local LibreOffice (recommended on Windows).",
    );

    if (!existsSync(workerComposeFilePath)) {
      throw new Error(`Missing docker-compose.worker.yml at ${workerComposeFilePath}`);
    }

    logInfo(
      `Docker worker DOCX temp: host ${docxImportPaths.hostPath} → container /tmp/collabsphere-docx-imports`,
    );
    logWarn(
      "With DEV_WORKER_DOCKER=1, do not run a host worker (pnpm --filter @collabsphere/worker dev) — " +
        "only the Docker worker should consume the docx-imports queue.",
    );

    const workerAlreadyUp = isDockerWorkerRunning(composeEnv);
    if (workerAlreadyUp && !buildWorker) {
      logInfo("Docker worker already running; skipping compose up (use --build-worker to rebuild)");
    } else {
      const workerArgs = [
        "compose",
        "-f",
        workerComposeFilePath,
        "up",
        "-d",
        "--remove-orphans",
      ];
      if (buildWorker) {
        workerArgs.push("--build");
        logInfo("rebuilding Docker worker image (--build-worker)");
      }
      await runCommand("docker", workerArgs, {
        cwd: rootDir,
        env: composeEnv,
      });
    }

    try {
      await verifyDocxImportDockerMount(composeEnv, docxImportPaths.tmpDir);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`[dev] ${detail}`);
    }

    logInfo(
      "Docker worker is up. Logs: docker compose -f docker-compose.worker.yml logs -f worker",
    );
  } else {
    await ensureDockerWorkerStopped(composeEnv);
    const libreOfficePath = assertLibreOfficeForHostWorker(appEnv);
    logInfo(
      `Host worker mode; DOCX temp: ${docxImportPaths.tmpDir}; LibreOffice: ${libreOfficePath}`,
    );
    logInfo(
      "pnpm dev starts the host worker in this terminal (no second terminal needed). " +
        "Watch for: Worker server is running (BullMQ processors active)",
    );
  }

  const collabPort = Number.parseInt(appEnv.COLLAB_PORT ?? "3002", 10) || 3002;
  const webDevPort = (() => {
    const webAppUrl = appEnv.WEB_APP_URL?.trim();
    if (webAppUrl) {
      try {
        const parsed = Number.parseInt(new URL(webAppUrl).port, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      } catch {
        /* fall through */
      }
    }
    return 8080;
  })();

  for (const surface of surfacesToStart) {
    if (surface.label === "api") {
      await assertListenPortAvailable(apiPort, "PORT");
      await assertApiPortNotAlreadyServing(apiPort);
    }
    if (surface.label === "web") {
      await assertListenPortAvailable(webDevPort, "Vite dev port", "127.0.0.1");
    }
    if (surface.label === "collab") {
      await assertListenPortAvailable(collabPort, "COLLAB_PORT", "127.0.0.1");
    }

    const workerScript = surface.label === "worker" ? "dev:once" : "dev";
    logInfo(`starting ${surface.label} via pnpm --filter ${surface.filter} run ${workerScript}`);

    const child = spawn(
      pnpmRunner.command,
      [...pnpmRunner.baseArgs, "--filter", surface.filter, "run", workerScript],
      {
        cwd: rootDir,
        env: envForSurface(surface, appEnv, workerEnvValues),
        stdio: "inherit",
        windowsHide: false
      }
    );

    children.set(surface.label, child);

    if (surface.label === "worker" && !workerDocker) {
      await assertHostWorkerProcessAlive(child);
      logInfo("host worker process is running");
    }

    if (surface.label === "api") {
      const healthUrl = `http://127.0.0.1:${apiPort}/api/v1/health`;
      logInfo(`waiting for API health at ${healthUrl}`);
      try {
        await waitForHttpOk(healthUrl);
      } catch (error) {
        const pid = findListeningPid(apiPort);
        const detail =
          error instanceof Error ? error.message : "API health check failed";
        throw new Error(
          pid
            ? `${detail} (port ${apiPort} is held by PID ${pid}; stop that process and retry).`
            : detail,
        );
      }
      if (child.exitCode !== null) {
        const pid = findListeningPid(apiPort);
        throw new Error(
          `API process exited before startup finished` +
            (pid ? ` (port ${apiPort} may still be held by PID ${pid}).` : "."),
        );
      }
      logInfo("API is healthy");
    }

    child.once("error", (error) => {
      if (shuttingDown) {
        return;
      }

      const detail =
        getErrorCode(error) === "ENOENT"
          ? "pnpm could not be found. Install pnpm 9.x and rerun `pnpm dev`."
          : `${surface.label} failed to start: ${error instanceof Error ? error.message : String(error)}`;

      void shutdown(detail, 1);
    });

    child.once("exit", (code, signal) => {
      children.delete(surface.label);

      if (shuttingDown) {
        return;
      }

      let detail = signal
        ? `${surface.label} exited unexpectedly due to signal ${signal}`
        : `${surface.label} exited unexpectedly with code ${code}`;
      if (surface.label === "web" && !signal && code === 1) {
        const pid = findListeningPid(webDevPort);
        if (pid) {
          detail += `\n[dev] ${formatPortInUseHelp(webDevPort, "Vite dev port")}`;
        }
      }
      const exitCode = !Number.isInteger(code) || code === 0 ? 1 : code;

      void shutdown(detail, exitCode);
    });
  }

  if (workerDocker) {
    logInfo(
      "local app processes started (worker runs in Docker); press Ctrl+C to stop host apps and the Docker worker",
    );
  } else {
    logInfo("all local app processes started; press Ctrl+C to stop them");
  }

  await new Promise(() => {});
};

main().catch((error) => {
  logError(error.message);
  process.exit(1);
});
