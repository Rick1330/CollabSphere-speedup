import { Extension } from "@tiptap/core";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { buildVersionDiffDecorations } from "@/features/documents/lib/version-diff/version-diff-decorations";

export const versionDiffPluginKey = new PluginKey("versionDiff");

export type VersionDiffExtensionOptions = {
  baselineDoc: PmNode | null;
  enabled: boolean;
};

export const VersionDiffExtension = Extension.create<VersionDiffExtensionOptions>({
  name: "versionDiff",

  addOptions() {
    return {
      baselineDoc: null,
      enabled: false,
    };
  },

  addProseMirrorPlugins() {
    const getBaseline = () => this.options.baselineDoc;
    const isEnabled = () => this.options.enabled && Boolean(this.options.baselineDoc);

    return [
      new Plugin({
        key: versionDiffPluginKey,
        state: {
          init: (_, state) => {
            const baseline = getBaseline();
            if (!isEnabled() || !baseline) return null;
            return buildVersionDiffDecorations(baseline, state.doc).decorations;
          },
          apply: (tr, prev, _, state) => {
            const baseline = getBaseline();
            if (!isEnabled() || !baseline) return null;
            if (tr.docChanged || tr.getMeta(versionDiffPluginKey) === "recalculate") {
              return buildVersionDiffDecorations(baseline, state.doc).decorations;
            }
            return prev ? prev.map(tr.mapping, tr.doc) : null;
          },
        },
        props: {
          decorations(state) {
            return versionDiffPluginKey.getState(state) ?? undefined;
          },
        },
      }),
    ];
  },
});
