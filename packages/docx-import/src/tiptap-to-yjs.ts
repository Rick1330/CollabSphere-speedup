import type { JSONContent } from "@tiptap/core";
import { getSchema } from "@tiptap/core";
import { prosemirrorJSONToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import { getDocxImportExtensions } from "./docx-import-extensions.js";

export function tiptapJsonToYjsUpdate(content: JSONContent): Uint8Array {
  const schema = getSchema(getDocxImportExtensions());
  const ydoc = prosemirrorJSONToYDoc(schema, content);
  return Y.encodeStateAsUpdate(ydoc);
}
