import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

export const FOCUS_PARAGRAPH_PLUGIN_KEY = new PluginKey("cs-focus-paragraph");
export const FOCUS_PARAGRAPH_META = "cs-focus-paragraph:update";

function activeBlockPos(view: EditorView): number | null {
  const { $from } = view.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.isBlock && node.type.name !== "doc") {
      return $from.before(depth);
    }
  }
  return null;
}

function buildFocusDecorations(view: EditorView, enabled: boolean): DecorationSet {
  if (!enabled) return DecorationSet.empty;

  const activePos = activeBlockPos(view);
  if (activePos == null) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  const { doc } = view.state;

  doc.forEach((node, offset) => {
    if (!node.isBlock || node.type.name === "doc") return;
    const pos = offset + 1;
    if (pos === activePos) return;
    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, {
        class: "cs-focus-dim-block",
      }),
    );
  });

  return DecorationSet.create(doc, decorations);
}

export function createFocusParagraphPlugin(
  enabled: boolean,
  getView: () => EditorView | null,
): Plugin {
  const rebuild = (): DecorationSet => {
    if (!enabled) return DecorationSet.empty;
    const view = getView();
    if (!view || view.isDestroyed) return DecorationSet.empty;
    return buildFocusDecorations(view, true);
  };

  return new Plugin({
    key: FOCUS_PARAGRAPH_PLUGIN_KEY,
    state: {
      init: () => rebuild(),
      apply: (tr, old) => {
        if (!enabled) return DecorationSet.empty;
        if (!tr.selectionSet && !tr.getMeta(FOCUS_PARAGRAPH_META) && !tr.docChanged) {
          return old;
        }
        return rebuild();
      },
    },
    // Decorations rebuild via `apply` on selectionSet / docChanged — never dispatch from
    // `update` (that caused an infinite dispatch → updatePluginViews loop).
    view() {
      return {};
    },
    props: {
      decorations(state) {
        return FOCUS_PARAGRAPH_PLUGIN_KEY.getState(state) as DecorationSet | undefined;
      },
    },
  });
}
