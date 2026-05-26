/**

 * DOCX import diagnostics for local dev (host worker mode).

 * Usage: pnpm exec tsx scripts/diagnose-docx-import.mts

 */

import { existsSync, readdirSync, readFileSync } from "node:fs";

import { isAbsolute, join, resolve } from "node:path";

import { spawnSync } from "node:child_process";

import { fileURLToPath } from "node:url";
import { getDocxImportTmpDir } from "@collabsphere/docx-import/server";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");



const DEFAULT_WIN_LIBREOFFICE_PATH =

  "C:\\Program Files\\LibreOffice\\program\\soffice.exe";



const WIN_LIBREOFFICE_X86_PATH =

  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe";



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



const listLibreOfficeCandidates = (env: Record<string, string>): string[] => {

  const configured = env.LIBREOFFICE_PATH?.trim();

  const defaults =

    process.platform === "win32"

      ? [

          DEFAULT_WIN_LIBREOFFICE_PATH,

          WIN_LIBREOFFICE_X86_PATH,

          ...findVersionedWindowsLibreOfficePaths(),

        ]

      : ["/usr/bin/libreoffice", "/usr/bin/soffice", "libreoffice", "soffice"];



  return [...new Set([configured, ...defaults].filter(Boolean) as string[])];

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

    return { ok: true as const, detail: output, status: result.status };

  }



  if (!result.error && libreOfficeVersionOutputLooksValid(result.stdout ?? "", result.stderr ?? "")) {

    return { ok: true as const, detail: output, status: result.status };

  }



  if (!result.error && spawnCode !== "ENOENT" && existsSync(bin)) {

    return {

      ok: true as const,

      detail: output || "(no version output; binary exists)",

      status: result.status,

    };

  }



  return {

    ok: false as const,

    detail:

      output ||

      (result.error instanceof Error ? result.error.message : "") ||

      `exit ${result.status ?? "unknown"} signal ${result.signal ?? "none"}`,

    status: result.status,

  };

};



const resolveLibreOfficeForDiagnostics = (env: Record<string, string>) => {

  const candidates = listLibreOfficeCandidates(env);

  const failures: string[] = [];

  let existingWithoutVersionProbe: {

    path: string;

    detail: string;

    exitCode: number | null;

  } | null = null;



  for (const candidate of candidates) {

    if (!existsSync(candidate)) {

      continue;

    }



    const probe = probeLibreOfficeBinary(candidate);

    if (probe.ok) {

      return { path: candidate, ok: true, detail: probe.detail, exitCode: probe.status };

    }



    failures.push(`${candidate}: ${probe.detail}`);

    existingWithoutVersionProbe ??= {

      path: candidate,

      detail: probe.detail,

      exitCode: probe.status,

    };

  }



  if (existingWithoutVersionProbe) {

    return {

      path: existingWithoutVersionProbe.path,

      ok: true,

      detail: `binary exists; --version probe failed (${existingWithoutVersionProbe.detail})`,

      exitCode: existingWithoutVersionProbe.exitCode,

      warn: true,

    };

  }



  return {

    path: candidates[0] ?? "(none)",

    ok: false,

    detail: failures.join("; ") || "no candidate binary found on disk",

    exitCode: null,

  };

};



const env = {

  ...parseEnvFile(join(rootDir, ".env")),

  ...parseEnvFile(join(rootDir, ".env.local")),

};



const tmpDirRaw =

  env.DOCX_IMPORT_TMP_DIR?.trim() ||

  env.DOCX_IMPORT_HOST_PATH?.trim() ||

  join(".tmp", "collabsphere-docx-imports");

const tmpDir = isAbsolute(tmpDirRaw) ? resolve(tmpDirRaw) : resolve(rootDir, tmpDirRaw);

if (env.DOCX_IMPORT_TMP_DIR?.trim()) {
  process.env.DOCX_IMPORT_TMP_DIR = tmpDir;
} else {
  delete process.env.DOCX_IMPORT_TMP_DIR;
}

const runtimeTmpDir = getDocxImportTmpDir();

const workerDocker = ["1", "true", "yes"].includes(
  (env.DEV_WORKER_DOCKER ?? "").trim().toLowerCase(),
);

console.log("=== DOCX import diagnostics ===\n");

console.log(`DEV_WORKER_DOCKER=${env.DEV_WORKER_DOCKER ?? "(unset)"} → ${workerDocker ? "Docker worker" : "host worker"}`);
console.log(`DOCX_IMPORT_TMP_DIR (.env resolved)=${tmpDir}`);
console.log(`getDocxImportTmpDir() (runtime)=${runtimeTmpDir}`);

if (tmpDir !== runtimeTmpDir) {
  console.log(
    "\nWARN: tmpDir mismatch — API/worker may read different folders. " +
      "Set DOCX_IMPORT_TMP_DIR in .env and start via pnpm dev (not a standalone worker without env).",
  );
}

console.log(`LIBREOFFICE_PATH=${env.LIBREOFFICE_PATH ?? "(unset)"}`);



const lo = resolveLibreOfficeForDiagnostics(env);

console.log(

  `\nLibreOffice (${lo.path}): ${lo.ok ? (lo.warn ? "OK (warn)" : "OK") : "FAIL"}`,

);

if (lo.exitCode !== null && lo.exitCode !== 0 && lo.ok) {

  console.log(`  --version exit code: ${lo.exitCode} (non-zero is OK if output looks valid)`);

}

if (lo.detail) {

  console.log(`  ${lo.detail.slice(0, 300)}`);

}



console.log(`\nTemp dir exists: ${existsSync(tmpDir)}`);

if (existsSync(tmpDir)) {

  const files = readdirSync(tmpDir);

  console.log(`  Files (${files.length}): ${files.slice(0, 12).join(", ") || "(empty)"}`);

}



const dockerPs = spawnSync(

  "docker",

  ["ps", "--format", "{{.Names}}\t{{.Status}}", "--filter", "name=worker"],

  { encoding: "utf8", windowsHide: true },

);

console.log("\nDocker containers matching 'worker':");

const dockerLines = dockerPs.stdout?.trim();

console.log(dockerLines || "  (none)");



if (dockerLines?.includes("collabsphere-worker") && !workerDocker) {

  console.log(

    "\nWARN: collabsphere-worker is running but DEV_WORKER_DOCKER=0. " +

      "It may steal docx-import jobs. Run: docker rm -f collabsphere-worker",

  );

}



console.log(
  "\nNote: `pnpm dev` with host worker removes only collabsphere-worker (docker rm -f). " +
    "It does not run docker compose down on the worker file — Postgres/Redis stay up.",
);

console.log(
  "Note: failed imports are retried up to 3 times; temp .docx files are kept until success or final failure " +
    "(not deleted on the first error).",
);



const redisUrl = env.REDIS_URL ?? "redis://127.0.0.1:6379";

console.log(`\nRedis (${redisUrl}):`);

const redisPing = spawnSync("docker", ["exec", "collabsphere-redis", "redis-cli", "PING"], {

  encoding: "utf8",

  windowsHide: true,

});

if (redisPing.status === 0) {

  console.log(`  ${redisPing.stdout?.trim()}`);

} else {

  console.log("  (could not ping via docker exec collabsphere-redis — is compose up?)");

}



console.log("\nNext: restart with `pnpm dev`, confirm host worker log line, then import a small DOCX.");


