import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { DocumentImagesService } from "../../apps/api/src/documents/document-images.service.js";

test("saveDocumentImage writes file and returns public URL", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-img-"));
  const previousStorage = process.env.STORAGE_LOCAL_PATH;
  const previousApiBase = process.env.API_BASE_URL;
  process.env.STORAGE_LOCAL_PATH = tmpDir;
  process.env.API_BASE_URL = "http://localhost:3001";

  try {
    const service = new DocumentImagesService();
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const result = await service.saveDocumentImage("doc-test-1", buffer, "image/png");

    assert.match(result.url, /^http:\/\/localhost:3001\/uploads\/doc-test-1\/images\/.+\.png$/);
    const filePath = path.join(tmpDir, "doc-test-1", "images", result.filename);
    const onDisk = await fs.readFile(filePath);
    assert.equal(onDisk.length, buffer.length);
  } finally {
    if (previousStorage === undefined) {
      delete process.env.STORAGE_LOCAL_PATH;
    } else {
      process.env.STORAGE_LOCAL_PATH = previousStorage;
    }
    if (previousApiBase === undefined) {
      delete process.env.API_BASE_URL;
    } else {
      process.env.API_BASE_URL = previousApiBase;
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test("saveDocumentImage rejects unsupported mime types", async () => {
  const service = new DocumentImagesService();
  await assert.rejects(
    () => service.saveDocumentImage("doc-1", Buffer.from("x"), "application/pdf"),
    /Unsupported image type/,
  );
});
