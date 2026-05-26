import { gunzipSync, gzipSync } from "node:zlib";
import fs from "node:fs/promises";
import type { DocxImportResult } from "./docx-types.js";
import { getDocxImportArtifactPath } from "./paths.js";

export type DocxImportArtifactPayload = DocxImportResult;

export async function writeImportArtifact(
  importJobId: string,
  payload: DocxImportArtifactPayload,
): Promise<string> {
  const artifactPath = getDocxImportArtifactPath(importJobId);
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload), "utf-8"));
  await fs.writeFile(artifactPath, compressed);
  return artifactPath;
}

export async function readImportArtifact(importJobId: string): Promise<DocxImportArtifactPayload> {
  const artifactPath = getDocxImportArtifactPath(importJobId);
  const compressed = await fs.readFile(artifactPath);
  const json = gunzipSync(compressed).toString("utf-8");
  return JSON.parse(json) as DocxImportArtifactPayload;
}

export async function deleteImportArtifact(importJobId: string): Promise<void> {
  const artifactPath = getDocxImportArtifactPath(importJobId);
  await fs.rm(artifactPath, { force: true });
}

export type DocxImportJobReturnValue = {
  artifactPath: string;
  pageSetup: DocxImportResult["pageSetup"];
  metadata: DocxImportResult["metadata"];
  warnings: DocxImportResult["warnings"];
  contentByteLength: number;
};
