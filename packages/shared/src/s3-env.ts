/**
 * Resolves S3/MinIO settings from process env (same rules as worker ConfigModule).
 */
export type StorageType = "local" | "s3";

export type ResolvedS3Env = {
  storageType: StorageType;
  endpoint?: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
};

export function readS3AccessKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.S3_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID ?? env.MINIO_ACCESS_KEY;
}

export function readS3SecretKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.S3_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY ?? env.MINIO_SECRET_KEY;
}

export function readS3Bucket(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.S3_BUCKET ?? env.AWS_S3_BUCKET ?? env.MINIO_BUCKET_DOCUMENTS;
}

export function readS3Region(env: NodeJS.ProcessEnv = process.env): string {
  return env.S3_REGION ?? env.AWS_REGION ?? "us-east-1";
}

export function readS3Endpoint(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw =
    env.S3_ENDPOINT ??
    (env.MINIO_ENDPOINT && env.MINIO_PORT
      ? `${env.MINIO_USE_SSL === "true" ? "https" : "http"}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`
      : env.MINIO_ENDPOINT);
  return raw?.trim() || undefined;
}

export function resolveS3Env(env: NodeJS.ProcessEnv = process.env): ResolvedS3Env {
  const storageType = (env.STORAGE_TYPE ?? "local").trim().toLowerCase() === "s3" ? "s3" : "local";
  return {
    storageType,
    endpoint: readS3Endpoint(env),
    region: readS3Region(env),
    accessKeyId: readS3AccessKey(env),
    secretAccessKey: readS3SecretKey(env),
    bucket: readS3Bucket(env),
  };
}

export function maskAccessKey(accessKeyId: string | undefined): string {
  if (!accessKeyId) return "(unset)";
  if (accessKeyId.length <= 4) return "****";
  return `${accessKeyId.slice(0, 4)}***`;
}
