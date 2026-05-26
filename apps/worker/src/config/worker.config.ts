import { registerAs } from "@nestjs/config";
import {
  readS3AccessKey,
  readS3Bucket,
  readS3Endpoint,
  readS3Region,
  readS3SecretKey,
  resolveS3Env,
} from "@collabsphere/shared/s3-env";

export default registerAs("worker", () => {
  const s3 = resolveS3Env(process.env);
  return {
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    storageType: s3.storageType,
    storageLocalPath: process.env.STORAGE_LOCAL_PATH ?? "./uploads",
    apiBaseUrl: process.env.API_BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3001",
    s3Endpoint: s3.endpoint,
    s3Region: s3.region,
    s3AccessKeyId: s3.accessKeyId,
    s3SecretAccessKey: s3.secretAccessKey,
    s3Bucket: s3.bucket,
    awsRegion: readS3Region(),
    awsAccessKeyId: readS3AccessKey(),
    awsSecretAccessKey: readS3SecretKey(),
    awsS3Bucket: readS3Bucket(),
    libreOfficePath: process.env.LIBREOFFICE_PATH,
    docxImportConcurrency: Number.parseInt(process.env.DOCX_IMPORT_CONCURRENCY ?? "2", 10),
    exportConcurrency: Number.parseInt(process.env.EXPORT_CONCURRENCY ?? "5", 10),
  };
});
