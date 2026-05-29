import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type DocumentFindMeta =
  | { type: "setQuery"; query: string }
  | { type: "setActiveIndex"; index: number }
  | { type: "clear" };

export type DocumentFindState = {
  query: string;
  matchPositions: number[];
  activeIndex: number;
};

const findPluginKey = new PluginKey<DocumentFindState>("documentFind");

function findMatchPositions(doc: import("@tiptap/pm/model").Node, query: string): number[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const haystack = node.text.toLowerCase();
    let from = 0;
    while (from < haystack.length) {
      const index = haystack.indexOf(needle, from);
      if (index < 0) break;
      positions.push(pos + index);
      from = index + Math.max(1, needle.length);
    }
  });
  return positions;
}

export const DocumentFindExtension = Extension.create({
  name: "documentFind",

  addCommands() {
    return {
      setDocumentFindQuery:
        (query: string) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(findPluginKey, { type: "setQuery", query } satisfies DocumentFindMeta);
            dispatch(tr);
          }
          return true;
        },
      setDocumentFindActiveIndex:
        (index: number) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(findPluginKey, {
              type: "setActiveIndex",
              index,
            } satisfies DocumentFindMeta);
            dispatch(tr);
          }
          return true;
        },
      clearDocumentFind:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(findPluginKey, { type: "clear" } satisfies DocumentFindMeta);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findPluginKey,
        state: {
          init(): DocumentFindState {
            return { query: "", matchPositions: [], activeIndex: 0 };
          },
          apply(tr, value) {
            let next = value;
            const meta = tr.getMeta(findPluginKey) as DocumentFindMeta | undefined;
            if (meta?.type === "clear") {
              next = { query: "", matchPositions: [], activeIndex: 0 };
            } else if (meta?.type === "setQuery") {
              const matchPositions = findMatchPositions(tr.doc, meta.query);
              next = { query: meta.query, matchPositions, activeIndex: 0 };
            } else if (meta?.type === "setActiveIndex") {
              next = { ...value, activeIndex: meta.index };
            } else if (tr.docChanged && value.query) {
              const matchPositions = findMatchPositions(tr.doc, value.query);
              const activeIndex = Math.min(value.activeIndex, Math.max(0, matchPositions.length - 1));
              next = { ...value, matchPositions, activeIndex };
            }
            return next;
          },
        },
        props: {
          decorations(state) {
            const pluginState = findPluginKey.getState(state);
            if (!pluginState?.query || pluginState.matchPositions.length === 0) {
              return DecorationSet.empty;
            }
            const queryLen = pluginState.query.trim().length;
            const decorations = pluginState.matchPositions.map((from, index) =>
              Decoration.inline(from, from + queryLen, {
                class:
                  index === pluginState.activeIndex
                    ? "cs-doc-find-match cs-doc-find-match--active"
                    : "cs-doc-find-match",
              }),
            );
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentFind: {
      setDocumentFindQuery: (query: string) => ReturnType;
      setDocumentFindActiveIndex: (index: number) => ReturnType;
      clearDocumentFind: () => ReturnType;
    };
  }
}

export function getDocumentFindState(editor: import("@tiptap/react").Editor | null): DocumentFindState | null {
  if (!editor || editor.isDestroyed) return null;
  return findPluginKey.getState(editor.state) ?? null;
}
