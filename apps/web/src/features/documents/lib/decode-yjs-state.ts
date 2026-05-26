type NodeBufferJson = {
  type: "Buffer";
  data: number[];
};

function isNodeBufferJson(value: unknown): value is NodeBufferJson {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as NodeBufferJson).type === "Buffer" &&
    Array.isArray((value as NodeBufferJson).data)
  );
}

/** Decode Yjs state from API wire formats (base64, Buffer JSON, byte arrays). */
export function decodeYjsState(raw: unknown): Uint8Array {
  if (!raw) return new Uint8Array(0);
  if (raw instanceof Uint8Array) return raw;
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw);
  if (Array.isArray(raw)) return Uint8Array.from(raw);
  if (isNodeBufferJson(raw)) return Uint8Array.from(raw.data);

  if (typeof raw === "string" && raw.length > 0) {
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  throw new Error("Invalid version Yjs state payload.");
}
