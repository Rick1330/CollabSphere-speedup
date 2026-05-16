export interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    details?: unknown;
    timestamp?: string;
  };
}

export interface ActionEnvelope<TExtra = Record<string, unknown>> {
  data?: {
    message?: string;
  } & TExtra;
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
}

export interface SingleEnvelope<TResource> {
  data?: TResource;
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
}

export function parseApiActionEnvelope<TExtra extends Record<string, unknown> = Record<string, unknown>>(
  payload: unknown,
): { message: string | null; extraData: TExtra } {
  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as ActionEnvelope<TExtra>).data
      : undefined;
  const message = typeof data?.message === "string" ? data.message : null;
  const { message: _drop, ...extraData } = (data ?? {}) as { message?: string } & TExtra;
  return { message, extraData: extraData as TExtra };
}

export function parseApiListEnvelope<TItem>(payload: unknown): { items: TItem[]; total: number } {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return { items: [], total: 0 };
  }
  const data = (payload as { data?: { items?: TItem[]; total?: number } }).data;
  const items = Array.isArray(data?.items) ? data.items : [];
  const total = typeof data?.total === "number" ? data.total : items.length;
  return { items, total };
}

export function parseApiSingleEnvelope<TResource>(payload: unknown): TResource {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    throw new Error("Invalid API payload envelope.");
  }
  const data = (payload as { data: unknown }).data;
  if (!data || typeof data !== "object") {
    throw new Error("Invalid API payload envelope.");
  }
  // Nest `wrapSuccessResponse` + `createSingleResourcePayload` → data.resource
  if ("resource" in data && (data as { resource: unknown }).resource !== undefined) {
    return (data as { resource: TResource }).resource;
  }
  // Legacy/unit-test shape: flattened resource under data
  return data as TResource;
}

export function parseApiErrorEnvelope(payload: unknown): { code: string; message: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as ApiErrorPayload).error;
  if (!error) return null;
  const code = typeof error.code === "string" ? error.code : "UNKNOWN_ERROR";
  const message = typeof error.message === "string" ? error.message : "Request failed.";
  return { code, message };
}
