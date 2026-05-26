import * as Y from "yjs";

export function loadYdocFromState(yjsState: Uint8Array): Y.Doc {
  const doc = new Y.Doc();
  if (yjsState.byteLength > 0) {
    Y.applyUpdate(doc, yjsState);
  }
  return doc;
}

export function encodeYdocState(ydoc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(ydoc);
}
