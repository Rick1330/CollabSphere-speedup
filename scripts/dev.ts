import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import { basename, dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { assertDevPortContract } from "../packages/shared/src/dev-port-contract.ts";

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
const composeFilePath = join(rootDir, "docker-compose.yml");
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
  console.log(`Usage: pnpm dev [--skip-compose]

Options:
  --skip-compose  Reuse existing Docker services and skip docker compose startup.
  --help          Show this help text.
`);
  process.exit(code);
};

const parseArgs = (argv) => {
  let skipCompose = false;

  for (const arg of argv) {
    if (arg === "--") {
      continue;
    }

    if (arg === "--skip-compose") {
      skipCompose = true;
      continue;
    }

    if (arg === "--help") {
      exitWithHelp(0);
    }

    throw new Error(`Unknown argument "${arg}". Use --help for supported options.`);
  }

  return { skipCompose };
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
  envLocalValues: existsSync(envLocalPath) ? parseEnvFile(envLocalPath, ".env.local") : ({} as EnvMap)
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

const assertListenPortAvailable = (port, label = "PORT") =>
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
    probe.listen(port, "0.0.0.0");
  });

const loadValidatedEnv = () => {
  ensureRequiredEnvFiles();
  const { exampleValues, envValues, envLocalValues } = loadEnvSources();
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

  return {
    apiPort,
    // Compose follows repo-local .env, while app children can layer runtime-only .env.local overrides.
    composeEnv: {
      ...process.env,
      ...envValues
    },
    appEnv: {
      ...process.env,
      ...appLocalValues,
      ...createLocalEmailEnv(appLocalValues)
    }
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

const ensureAppSurfaces = () => {
  for (const surface of appSurfaces) {
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

const envForSurface = (surface, appEnv) => {
  if (surface.label !== "collab") {
    return appEnv;
  }
  const { PORT: _apiPort, ...rest } = appEnv;
  return {
    ...rest,
    COLLAB_PORT: appEnv.COLLAB_PORT ?? "3002",
  };
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

const main = async () => {
  const { skipCompose } = parseArgs(process.argv.slice(2));

  if (!existsSync(composeFilePath) && !skipCompose) {
    throw new Error(`Missing docker-compose.yml at ${composeFilePath}`);
  }

  logInfo("validating local environment against .env.example");
  ensureAppSurfaces();
  const { composeEnv, appEnv, apiPort } = loadValidatedEnv();
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
  } else {
    logInfo("ensuring docker compose services are up and healthy");
    await runCommand("docker", ["compose", "-f", composeFilePath, "up", "-d", "--wait"], {
      cwd: rootDir,
      env: composeEnv
    });
    logInfo("docker compose services are ready");
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

  for (const surface of appSurfaces) {
    if (surface.label === "api") {
      await assertListenPortAvailable(apiPort, "PORT");
      await assertApiPortNotAlreadyServing(apiPort);
    }
    if (surface.label === "web") {
      await assertListenPortAvailable(webDevPort, "Vite dev port");
    }
    if (surface.label === "collab") {
      await assertListenPortAvailable(collabPort, "COLLAB_PORT");
    }

    logInfo(`starting ${surface.label} via pnpm --filter ${surface.filter} run dev`);

    const child = spawn(
      pnpmRunner.command,
      [...pnpmRunner.baseArgs, "--filter", surface.filter, "run", "dev"],
      {
        cwd: rootDir,
        env: envForSurface(surface, appEnv),
        stdio: "inherit",
        windowsHide: false
      }
    );

    children.set(surface.label, child);

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

      const detail = signal
        ? `${surface.label} exited unexpectedly due to signal ${signal}`
        : `${surface.label} exited unexpectedly with code ${code}`;
      const exitCode = !Number.isInteger(code) || code === 0 ? 1 : code;

      void shutdown(detail, exitCode);
    });
  }

  logInfo("all local app processes started; press Ctrl+C to stop them");

  await new Promise(() => {});
};

main().catch((error) => {
  logError(error.message);
  process.exit(1);
});
