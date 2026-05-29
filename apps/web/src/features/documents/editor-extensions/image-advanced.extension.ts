import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageBlockView } from "@/features/documents/editor-extensions/image-block-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageAdvanced: {
      setImageAlign: (align: "left" | "center" | "right") => ReturnType;
      setImageWidth: (widthPercent: number) => ReturnType;
    };
  }
}

export const ImageAdvanced = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") ?? "center",
        renderHTML: (attributes) =>
          attributes.align ? { "data-align": String(attributes.align) } : {},
      },
      width: {
        default: 100,
        parseHTML: (element) => Number(element.getAttribute("data-width") ?? "100"),
        renderHTML: (attributes) =>
          attributes.width != null ? { "data-width": String(attributes.width) } : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setImageAlign:
        (align) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { align }),
      setImageWidth:
        (widthPercent) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, {
            width: Math.min(100, Math.max(15, Math.round(widthPercent))),
          }),
    };
  },
});
