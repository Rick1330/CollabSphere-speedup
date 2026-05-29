import Heading from "@tiptap/extension-heading";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { assignHeadingAnchorIds } from "@/features/documents/lib/document-heading-slugs";

const headingAnchorKey = new PluginKey("headingAnchorIds");

export const HeadingWithAnchor = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      anchorId: {
        default: null,
        parseHTML: (element) => {
          const id = element.getAttribute("id");
          if (id?.startsWith("cs-h-")) return id.slice(5);
          return element.getAttribute("data-anchor-id");
        },
        renderHTML: (attributes) => {
          const anchorId = attributes.anchorId as string | null;
          if (!anchorId) return {};
          return {
            id: `cs-h-${anchorId}`,
            "data-anchor-id": anchorId,
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const parent = this.parent?.() ?? [];
    return [
      ...parent,
      new Plugin({
        key: headingAnchorKey,
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const { doc } = newState;
          let changed = false;
          const nextTr = newState.tr;
          const texts: string[] = [];
          const positions: number[] = [];

          doc.descendants((node, pos) => {
            if (node.type.name !== "heading") return;
            texts.push(node.textContent.trim());
            positions.push(pos);
          });

          const anchorIds = assignHeadingAnchorIds(texts);
          positions.forEach((pos, index) => {
            const node = doc.nodeAt(pos);
            if (!node || node.type.name !== "heading") return;
            const nextId = anchorIds[index];
            if (node.attrs.anchorId === nextId) return;
            nextTr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              anchorId: nextId,
            });
            changed = true;
          });

          return changed ? nextTr : null;
        },
      }),
    ];
  },
});
