/**
 * MinIO / S3 connectivity diagnostics for local dev.
 * Usage: pnpm diagnose:minio
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ListBucketsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  maskAccessKey,
  readS3AccessKey,
  resolveS3Env,
} from "@collabsphere/shared/s3-env";
import {
  checkMinioHostPort,
  formatMinioPortCheckFailure,
} from "./lib/minio-port-check.mts";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

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

const applyEnvToProcess = (values: Record<string, string>) => {
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
};

const env = {
  ...parseEnvFile(join(rootDir, ".env")),
  ...parseEnvFile(join(rootDir, ".env.local")),
};
applyEnvToProcess(env);

const s3 = resolveS3Env(process.env);
const minioRootUser = env.MINIO_ROOT_USER?.trim();
const accessKey = readS3AccessKey(process.env);

console.log("=== MinIO / S3 diagnostics ===\n");
console.log(`STORAGE_TYPE=${s3.storageType}`);
console.log(`S3_ENDPOINT=${s3.endpoint ?? "(unset)"}`);
console.log(`S3_BUCKET=${s3.bucket ?? "(unset)"}`);
console.log(`S3_ACCESS_KEY_ID=${maskAccessKey(accessKey)}`);
console.log(`MINIO_ROOT_USER=${minioRootUser ?? "(unset)"}`);

if (s3.storageType !== "s3") {
  console.log("\nSTORAGE_TYPE is not s3 — worker uses local disk for images.");
  console.log("Set STORAGE_TYPE=s3 in .env to test MinIO.");
  process.exit(0);
}

if (minioRootUser && accessKey && minioRootUser !== accessKey) {
  console.log(
    "\nWARN: S3_ACCESS_KEY_ID does not match MINIO_ROOT_USER. " +
      "MinIO uses root user as the S3 access key — align both or update .env to match the running container.",
  );
}

const dockerEnv = spawnSync(
  "docker",
  ["exec", "collabsphere-minio", "printenv", "MINIO_ROOT_USER"],
  { encoding: "utf8", windowsHide: true },
);
if (dockerEnv.status === 0) {
  const liveUser = dockerEnv.stdout?.trim();
  if (liveUser && accessKey && liveUser !== accessKey) {
    console.log(
      `\nWARN: Running MinIO container MINIO_ROOT_USER=${liveUser} but .env access key is ${maskAccessKey(accessKey)}.`,
    );
    console.log(
      "  Fix: update .env S3_ACCESS_KEY_ID / AWS_ACCESS_KEY_ID and MINIO_ROOT_USER to match, " +
        "or reset the minio_data volume (see apps/worker/README.md).",
    );
  } else if (liveUser) {
    console.log(`\nDocker MinIO MINIO_ROOT_USER=${liveUser} (matches .env access key)`);
  }
} else {
  console.log("\n(could not read MINIO_ROOT_USER from collabsphere-minio — is compose up?)");
}

if (!s3.endpoint || !s3.accessKeyId || !s3.secretAccessKey || !s3.bucket) {
  console.error("\nFAIL: S3 endpoint, credentials, or bucket missing in .env");
  process.exit(1);
}

const hostPort = Number.parseInt(env.MINIO_API_PORT ?? "9000", 10) || 9000;
const portCheck = checkMinioHostPort(hostPort, true);
console.log(`\nHost port ${hostPort} publishers: ${portCheck.owners.length > 0 ? portCheck.owners.join(", ") : "(none)"}`);
if (!portCheck.ok) {
  console.error(`\nFAIL: ${formatMinioPortCheckFailure(portCheck)}`);
  process.exit(1);
}

const client = new S3Client({
  region: s3.region,
  endpoint: s3.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
  },
});

try {
  console.log("\nTesting ListBuckets...");
  const buckets = await client.send(new ListBucketsCommand({}));
  const names = buckets.Buckets?.map((b) => b.Name).filter(Boolean) ?? [];
  console.log(`OK — buckets: ${names.length > 0 ? names.join(", ") : "(none)"}`);

  const healthKey = ".health-check";
  console.log(`Testing PutObject s3://${s3.bucket}/${healthKey}...`);
  await client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: healthKey,
      Body: Buffer.from("OK"),
      ContentType: "text/plain",
    }),
  );
  console.log("OK — upload succeeded");
  console.log(`\nAll checks passed. Worker should use endpoint=${s3.endpoint} bucket=${s3.bucket}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nFAIL: ${message}`);
  if (/does not exist in our records/i.test(message)) {
    console.error(
      "\nInvalidAccessKeyId — usually wrong MinIO on this port or mismatched secret.",
    );
  }
  const portRecheck = checkMinioHostPort(hostPort);
  if (!portRecheck.ok) {
    console.error(`  ${formatMinioPortCheckFailure(portRecheck)}`);
  } else {
    console.error("  docker exec collabsphere-minio printenv MINIO_ROOT_USER MINIO_ROOT_PASSWORD");
    console.error("  Align .env S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY with those values,");
    console.error("  or reset volume: docker volume rm collabsphere-repo-recovery_minio_data");
  }
  console.error("  Temporary workaround: STORAGE_TYPE=local in .env");
  process.exit(1);
}
