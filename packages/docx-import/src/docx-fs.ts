export async function readDocxBuffer(docxPath: string): Promise<ArrayBuffer> {
  const fs = await import("node:fs/promises");
  const buf = await fs.readFile(docxPath);
  const copy = new Uint8Array(buf.length);
  copy.set(buf);
  return copy.buffer;
}
