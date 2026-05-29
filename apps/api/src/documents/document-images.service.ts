import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    default:
      return ".bin";
  }
}

@Injectable()
export class DocumentImagesService {
  private readonly storageRoot = path.resolve(process.env.STORAGE_LOCAL_PATH ?? "./uploads");

  private readonly apiBaseUrl = (process.env.API_BASE_URL ?? "http://localhost:3001").replace(
    /\/$/,
    "",
  );

  async saveDocumentImage(
    documentId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ url: string; filename: string }> {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new BadRequestException(
        "Unsupported image type. Use JPEG, PNG, GIF, or WebP.",
      );
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException("Image exceeds maximum size (10 MB).");
    }
    if (buffer.length === 0) {
      throw new BadRequestException("Image file is empty.");
    }

    const filename = `${randomUUID()}${extensionForMime(mimeType)}`;
    const dir = path.join(this.storageRoot, documentId, "images");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), buffer);

    return {
      filename,
      url: `${this.apiBaseUrl}/uploads/${documentId}/images/${filename}`,
    };
  }
}
