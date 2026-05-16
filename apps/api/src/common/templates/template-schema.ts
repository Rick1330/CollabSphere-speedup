import { AppError } from "../filters/app-error.filter.js";

type JsonObject = Record<string, unknown>;

export type TemplateEnvelopeV2 = {
  schemaVersion: 2;
  format?: string;
  metadata?: JsonObject;
  properties?: JsonObject;
  structure?: JsonObject;
};

export type DocumentTemplateBlock = {
  type: string;
  attrs?: JsonObject;
  content?: unknown[];
};

export type TemplateVariableSpec = {
  key: string;
  label: string;
  required?: boolean;
};

export type DocumentTemplateRegionSpec = {
  id: string;
  key: string;
  title: string;
};

export type DocumentTemplateContentV2 = {
  schemaVersion: 2;
  format?: string;
  metadata?: JsonObject;
  properties?: JsonObject;
  blocks: DocumentTemplateBlock[];
  regions?: DocumentTemplateRegionSpec[];
  variables?: TemplateVariableSpec[];
};

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isOptionalRecord = (value: unknown) => value === undefined || value === null || isRecord(value);

const normalizeFormat = (value: unknown) => (typeof value === "string" ? value.trim() : undefined);

export const parseTemplateEnvelopeV2 = ({
  raw,
  allowedFormats,
}: {
  raw: unknown;
  allowedFormats: readonly string[];
}): TemplateEnvelopeV2 => {
  if (!isRecord(raw)) {
    throw new AppError({ code: "TEMPLATE_INVALID" });
  }
  if (raw.schemaVersion !== 2) {
    throw new AppError({ code: "TEMPLATE_SCHEMA_UNSUPPORTED" });
  }

  const format = normalizeFormat(raw.format);
  if (format && !allowedFormats.includes(format)) {
    throw new AppError({ code: "TEMPLATE_INVALID" });
  }

  if (!isOptionalRecord(raw.metadata) || !isOptionalRecord(raw.properties) || !isOptionalRecord(raw.structure)) {
    throw new AppError({ code: "TEMPLATE_INVALID" });
  }

  return {
    schemaVersion: 2,
    format,
    metadata: raw.metadata ? { ...raw.metadata } : undefined,
    properties: raw.properties ? { ...raw.properties } : undefined,
    structure: raw.structure ? { ...raw.structure } : undefined,
  };
};

export const parseDocumentTemplateContent = (raw: unknown): DocumentTemplateContentV2 => {
  const envelope = parseTemplateEnvelopeV2({
    raw,
    allowedFormats: ["document-v2", "structured", "richdocument"],
  });

  const structure = envelope.structure ?? {};
  const rawBlocks = structure.blocks;
  const isRich = envelope.format === "richdocument";

  const rawRegions = structure.regions;
  let regions: DocumentTemplateRegionSpec[] | undefined;
  if (Array.isArray(rawRegions)) {
    regions = rawRegions.map((entry) => {
      if (!isRecord(entry)) {
        throw new AppError({ code: "TEMPLATE_INVALID" });
      }
      const id = typeof entry.id === "string" ? entry.id.trim() : "";
      const key = typeof entry.key === "string" ? entry.key.trim() : "";
      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      if (!id || !key || !title) {
        throw new AppError({ code: "TEMPLATE_INVALID" });
      }
      return { id, key, title };
    });
  }

  const rawVars = structure.variables;
  let variables: TemplateVariableSpec[] | undefined;
  if (Array.isArray(rawVars)) {
    variables = rawVars.map((entry) => {
      if (!isRecord(entry)) {
        throw new AppError({ code: "TEMPLATE_INVALID" });
      }
      const key = typeof entry.key === "string" ? entry.key.trim() : "";
      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      if (!key || !label) {
        throw new AppError({ code: "TEMPLATE_INVALID" });
      }
      return {
        key,
        label,
        required: Boolean(entry.required),
      };
    });
  }

  let blocks: DocumentTemplateBlock[];
  if (!Array.isArray(rawBlocks)) {
    if (isRich) {
      blocks = [];
    } else {
      throw new AppError({ code: "TEMPLATE_INVALID" });
    }
  } else {
    blocks = rawBlocks.map((entry) => {
      if (!isRecord(entry) || typeof entry.type !== "string" || entry.type.trim().length === 0) {
        throw new AppError({ code: "TEMPLATE_INVALID" });
      }
      if (entry.attrs !== undefined && entry.attrs !== null && !isRecord(entry.attrs)) {
        throw new AppError({ code: "TEMPLATE_INVALID" });
      }
      if (entry.content !== undefined && !Array.isArray(entry.content)) {
        throw new AppError({ code: "TEMPLATE_INVALID" });
      }
      return {
        type: entry.type.trim(),
        attrs: entry.attrs ? { ...entry.attrs } : undefined,
        content: entry.content ? [...entry.content] : undefined,
      };
    });
  }

  return {
    schemaVersion: 2,
    format: envelope.format,
    metadata: envelope.metadata,
    properties: envelope.properties,
    blocks,
    regions,
    variables,
  };
};
