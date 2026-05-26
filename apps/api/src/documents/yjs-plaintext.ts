import * as Y from "yjs";

const COLLAB_XML_FRAGMENT_NAMES = ["prosemirror", "default"] as const;

const walkXml = (
  node: Y.XmlFragment | Y.AbstractType<unknown> | Y.XmlText,
  lines: string[],
): void => {
  if (node instanceof Y.XmlText) {
    const text = node.toString().trim();
    if (text) lines.push(text);
    return;
  }

  if (node instanceof Y.XmlElement) {
    const name = node.nodeName;
    if (name === "instructionText") return;

    if (name === "fillableField") {
      const value = node.getAttribute("value");
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed) lines.push(trimmed);
      }
    }

    node.toArray().forEach((child) => {
      walkXml(child as unknown as Y.AbstractType<unknown> | Y.XmlText, lines);
    });
    return;
  }

  if (node instanceof Y.XmlFragment) {
    node.toArray().forEach((child) => {
      walkXml(child as unknown as Y.AbstractType<unknown> | Y.XmlText, lines);
    });
  }
};

export const extractPlaintextFromYdoc = (ydoc: Y.Doc): string => {
  const lines: string[] = [];

  for (const name of COLLAB_XML_FRAGMENT_NAMES) {
    const fragment = ydoc.getXmlFragment(name);
    if (fragment.length > 0) {
      walkXml(fragment, lines);
      if (lines.length > 0) {
        return lines.join("\n").trim();
      }
    }
  }

  for (const name of COLLAB_XML_FRAGMENT_NAMES) {
    walkXml(ydoc.getXmlFragment(name), lines);
  }

  return lines.join("\n").trim();
};

export const toUint8Array = (value: Uint8Array | Buffer | null | undefined): Uint8Array => {
  if (!value) return new Uint8Array(0);
  if (value instanceof Uint8Array) return value;
  return new Uint8Array(value);
};

export const yjsStateToBase64 = (value: Uint8Array | Buffer | null | undefined): string => {
  const bytes = toUint8Array(value);
  if (bytes.byteLength === 0) return "";
  return Buffer.from(bytes).toString("base64");
};

export const resolveVersionPlaintext = (input: {
  plaintext: string | null | undefined;
  yjsState: Uint8Array | Buffer | null | undefined;
}): string => {
  const stored = input.plaintext?.trim() ?? "";
  if (stored.length > 0) return stored;

  const bytes = toUint8Array(input.yjsState);
  if (bytes.byteLength === 0) return "";

  return extractPlaintextFromYjsUpdate(bytes);
};

export const extractPlaintextFromYjsUpdate = (update: Uint8Array): string => {
  if (update.byteLength === 0) return "";
  const ydoc = new Y.Doc();
  try {
    Y.applyUpdate(ydoc, update);
    return extractPlaintextFromYdoc(ydoc);
  } finally {
    ydoc.destroy();
  }
};

/** Backfill from yjs when stored plaintext is empty; never throws. */
export const safeResolveVersionPlaintext = (input: {
  plaintext: string | null | undefined;
  yjsState: Uint8Array | Buffer | null | undefined;
}): string => {
  try {
    return resolveVersionPlaintext(input);
  } catch {
    return input.plaintext?.trim() ?? "";
  }
};
