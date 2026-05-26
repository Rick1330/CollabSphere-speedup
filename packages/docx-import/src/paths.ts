import os from "node:os";
import path from "node:path";

/** Resolves from `process.env.DOCX_IMPORT_TMP_DIR` on each call (safe after late env injection). */
export function getDocxImportTmpDir(): string {
  const fromEnv = process.env.DOCX_IMPORT_TMP_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.join(os.tmpdir(), "collabsphere-docx-imports");
}

/** @deprecated Prefer {@link getDocxImportTmpDir} for correct resolution after env changes. */
export function docxImportTmpDir(): string {
  return getDocxImportTmpDir();
}

export function getDocxInputPath(importJobId: string): string {
  return path.join(getDocxImportTmpDir(), `${importJobId}.docx`);
}

export function getDocxHtmlPath(importJobId: string): string {
  return path.join(getDocxImportTmpDir(), `${importJobId}.html`);
}

export function getDocxImportArtifactPath(importJobId: string): string {
  return path.join(getDocxImportTmpDir(), `${importJobId}.result.json.gz`);
}
