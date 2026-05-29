import type { Prisma } from "@prisma/client";
import * as Y from "yjs";
import { parseDocumentTemplateContent } from "../common/templates/template-schema.js";
import { extractPlaintextFromYjsUpdate } from "./yjs-plaintext.js";

export type TemplateRowForSeed = {
  id: string;
  version: number;
  schemaVersion: number;
  contentFormat: string | null;
  content: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const extractYjsSeedBase64FromTemplateContent = (raw: unknown): string | null => {
  if (!isRecord(raw)) return null;
  const structure = raw.structure;
  if (!isRecord(structure)) return null;
  const seed = structure.yjsSeedBase64;
  return typeof seed === "string" && seed.trim().length > 0 ? seed.trim() : null;
};

const extractPlaintextSeedFromTemplateContent = (raw: unknown): string | null => {
  if (!isRecord(raw)) return null;
  const structure = raw.structure;
  if (!isRecord(structure)) return null;
  const seed = structure.plaintextSeed;
  return typeof seed === "string" && seed.trim().length > 0 ? seed.trim() : null;
};

const emptyYjsUpdate = (): Uint8Array => {
  const ydoc = new Y.Doc();
  try {
    return Y.encodeStateAsUpdate(ydoc);
  } finally {
    ydoc.destroy();
  }
};

const decodeYjsSeedBase64 = (base64: string): Uint8Array => {
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength === 0) {
    return emptyYjsUpdate();
  }
  return new Uint8Array(buffer);
};

const collectTextFromNode = (value: unknown): string[] => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectTextFromNode(entry));
  }
  if (isRecord(value)) {
    return Object.values(value).flatMap((entry) => collectTextFromNode(entry));
  }
  return [];
};

export const toPrismaBytes = (data: Uint8Array): Uint8Array<ArrayBuffer> => {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return new Uint8Array(buffer);
};

export type ResolvedDocumentTemplateSeed = {
  contentYjs: Uint8Array<ArrayBuffer>;
  contentPlaintext: string;
  templateProperties: Prisma.InputJsonValue | null;
  regionOrder: Prisma.InputJsonValue | undefined;
  templateSchemaVersion: number | undefined;
};

export const resolveDocumentSeedFromTemplate = (
  template: TemplateRowForSeed,
): ResolvedDocumentTemplateSeed => {
  const parsed = parseDocumentTemplateContent(template.content);
  const yjsSeedBase64 = extractYjsSeedBase64FromTemplateContent(template.content);
  const contentYjs = yjsSeedBase64 ? decodeYjsSeedBase64(yjsSeedBase64) : emptyYjsUpdate();

  const fromSeed = extractPlaintextSeedFromTemplateContent(template.content);
  const fromBlocks = collectTextFromNode(parsed.blocks).join(" ").trim();
  const fromYjs = extractPlaintextFromYjsUpdate(contentYjs).trim();
  const contentPlaintext = (fromSeed || fromYjs || fromBlocks).slice(0, 20_000);

  const templateProperties: Record<string, unknown> = {
    template: {
      id: template.id,
      version: template.version,
      schemaVersion: template.schemaVersion,
      format: parsed.format ?? template.contentFormat ?? null,
      metadata: parsed.metadata ?? null,
      properties: parsed.properties ?? null,
    },
    blocks: parsed.blocks,
    ...(parsed.regions ? { regions: parsed.regions } : {}),
    ...(parsed.variables ? { variables: parsed.variables } : {}),
    ...(contentYjs.byteLength > 0 ? { templateSeededAt: new Date().toISOString() } : {}),
  };

  const isRichDocument = parsed.format === "richdocument";
  const regionOrderJson: Prisma.InputJsonValue | undefined =
    isRichDocument && parsed.regions && parsed.regions.length > 0
      ? (JSON.parse(JSON.stringify(parsed.regions.map((r) => r.id))) as Prisma.InputJsonValue)
      : undefined;
  const templateSchemaVersion = isRichDocument ? template.schemaVersion : undefined;

  return {
    contentYjs: toPrismaBytes(contentYjs),
    contentPlaintext,
    templateProperties: JSON.parse(JSON.stringify(templateProperties)) as Prisma.InputJsonValue,
    regionOrder: regionOrderJson,
    templateSchemaVersion,
  };
};
