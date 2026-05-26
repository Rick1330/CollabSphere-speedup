import fs from "node:fs/promises";
import path from "node:path";
import { Inject, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { maskAccessKey } from "@collabsphere/shared/s3-env";

const S3_HEALTH_CHECK_KEY = ".health-check";

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private storageType: "local" | "s3" = "local";
  private localStoragePath = "./uploads";
  private apiBaseUrl = "http://localhost:3000";
  private s3Client?: S3Client;
  private s3Bucket?: string;
  private s3Endpoint?: string;
  private s3Region = "us-east-1";
  private s3Configured = false;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async onModuleInit() {
    this.storageType = this.config.get<"local" | "s3">("worker.storageType") ?? "local";
    this.localStoragePath = this.config.get<string>("worker.storageLocalPath") ?? "./uploads";
    this.apiBaseUrl = this.config.get<string>("worker.apiBaseUrl") ?? "http://localhost:3000";
    this.s3Bucket = this.config.get<string>("worker.s3Bucket");
    this.s3Endpoint = this.config.get<string>("worker.s3Endpoint");
    this.s3Region = this.config.get<string>("worker.s3Region") ?? "us-east-1";

    const accessKeyId = this.config.get<string>("worker.s3AccessKeyId");
    const secretAccessKey = this.config.get<string>("worker.s3SecretAccessKey");
    const explicitS3 = (process.env.STORAGE_TYPE ?? "").trim().toLowerCase() === "s3";

    if (this.storageType !== "s3") {
      this.logger.log(`Local storage enabled (path=${this.localStoragePath})`);
      return;
    }

    if (!accessKeyId || !secretAccessKey || !this.s3Bucket) {
      const message =
        "STORAGE_TYPE=s3 but S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, or S3_BUCKET is missing";
      if (explicitS3) {
        throw new Error(message);
      }
      this.logger.warn("S3 credentials/bucket incomplete; falling back to local storage");
      this.storageType = "local";
      return;
    }

    this.s3Client = new S3Client({
      region: this.s3Region,
      endpoint: this.s3Endpoint,
      forcePathStyle: Boolean(this.s3Endpoint),
      credentials: { accessKeyId, secretAccessKey },
    });
    this.s3Configured = true;

    this.logger.log(
      `S3 storage enabled (bucket=${this.s3Bucket}, endpoint=${this.s3Endpoint ?? "aws-default"}, accessKey=${maskAccessKey(accessKeyId)})`,
    );

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: S3_HEALTH_CHECK_KEY,
          Body: Buffer.from("OK"),
          ContentType: "text/plain",
        }),
      );
      this.logger.log("MinIO connection verified");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`MinIO connection failed: ${message}`);
      this.logger.error(
        "Check credentials: docker exec collabsphere-minio printenv MINIO_ROOT_USER MINIO_ROOT_PASSWORD",
      );
      this.logger.error("Run: pnpm diagnose:minio — or set STORAGE_TYPE=local in .env to skip S3");
      if (explicitS3) {
        throw new Error(`MinIO/S3 health check failed: ${message}`);
      }
      this.storageType = "local";
      this.s3Client = undefined;
      this.s3Configured = false;
    }
  }

  async uploadDocumentImage(
    documentId: string,
    filename: string,
    buffer: Buffer,
  ): Promise<string> {
    if (this.storageType === "s3" && this.s3Client && this.s3Bucket && this.s3Configured) {
      return this.uploadToS3(documentId, filename, buffer);
    }
    return this.uploadToLocal(documentId, filename, buffer);
  }

  private async uploadToS3(documentId: string, filename: string, buffer: Buffer): Promise<string> {
    const key = `documents/${documentId}/images/${filename}`;
    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket!,
        Key: key,
        Body: buffer,
        ContentType: this.contentType(filename),
      }),
    );

    if (this.s3Endpoint) {
      const base = this.s3Endpoint.replace(/\/$/, "");
      return `${base}/${this.s3Bucket}/${key}`;
    }

    return `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${key}`;
  }

  private async uploadToLocal(documentId: string, filename: string, buffer: Buffer): Promise<string> {
    const dir = path.join(this.localStoragePath, documentId, "images");
    await fs.mkdir(dir, { recursive: true });
    const filepath = path.join(dir, filename);
    await fs.writeFile(filepath, buffer);
    return `${this.apiBaseUrl}/uploads/${documentId}/images/${filename}`;
  }

  private contentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const types: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
    };
    return types[ext] ?? "application/octet-stream";
  }
}
