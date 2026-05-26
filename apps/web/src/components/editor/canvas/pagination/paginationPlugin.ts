import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import { getPageContentBox, type PageSetup } from "../pageSetup";
import { measureDocumentPages, type PageMeasureResult } from "./measureDocumentPages";

export const PAGINATION_PLUGIN_KEY = new PluginKey("cs-pagination");
export const PAGINATION_REMEASURE_META = "cs-pagination:remeasure";

export interface PaginationPluginState {
  measure: PageMeasureResult;
  decorations: DecorationSet;
}

export interface PaginationPluginOptions {
  pageSetup: PageSetup;
  showPageBreaks?: boolean;
  enabled?: boolean;
  getView: () => EditorView | null;
}

const REMEASURE_DEBOUNCE_MS = 100;

function buildSpacerDecorations(
  doc: EditorView["state"]["doc"],
  measure: PageMeasureResult,
  showPageBreaks: boolean,
): Decoration[] {
  const decorations: Decoration[] = [];

  for (let i = 0; i < measure.pageBreaks.length; i += 1) {
    const { pos, spacerHeight } = measure.pageBreaks[i];
    decorations.push(
      Decoration.widget(
        pos,
        () => {
          const el = document.createElement("div");
          el.className = showPageBreaks
            ? "cs-pagination-spacer cs-pagination-spacer--debug"
            : "cs-pagination-spacer";
          el.style.height = `${spacerHeight}px`;
          el.setAttribute("aria-hidden", "true");
          el.dataset.pageIndex = String(i + 2);
          return el;
        },
        { side: -1, key: `page-spacer-${i}-${spacerHeight}` },
      ),
    );
  }

  return decorations;
}

function applyProseMirrorPageStyles(view: EditorView, pageSetup: PageSetup): void {
  const { contentWidth, contentHeight, pageWidth } = getPageContentBox(pageSetup);
  const { margins } = pageSetup;
  const dom = view.dom;
  dom.classList.add("cs-paginated-prosemirror");
  dom.style.setProperty("--cs-page-content-height", `${contentHeight}px`);
  dom.style.setProperty("--cs-page-content-width", `${contentWidth}px`);
  dom.style.setProperty("--cs-page-width", `${pageWidth}px`);
  dom.style.setProperty("--cs-page-margin-top", `${margins.top}px`);
  dom.style.setProperty("--cs-page-margin-right", `${margins.right}px`);
  dom.style.setProperty("--cs-page-margin-bottom", `${margins.bottom}px`);
  dom.style.setProperty("--cs-page-margin-left", `${margins.left}px`);
}

function clearProseMirrorPageStyles(view: EditorView): void {
  const dom = view.dom;
  dom.classList.remove("cs-paginated-prosemirror");
  dom.style.removeProperty("--cs-page-content-height");
  dom.style.removeProperty("--cs-page-content-width");
  dom.style.removeProperty("--cs-page-width");
  dom.style.removeProperty("--cs-page-margin-top");
  dom.style.removeProperty("--cs-page-margin-right");
  dom.style.removeProperty("--cs-page-margin-bottom");
  dom.style.removeProperty("--cs-page-margin-left");
}

function buildPluginState(
  view: EditorView,
  pageSetup: PageSetup,
  showPageBreaks: boolean,
): PaginationPluginState {
  const { contentHeight } = getPageContentBox(pageSetup);
  const measure = measureDocumentPages(view, contentHeight, pageSetup);
  const decorations = DecorationSet.create(
    view.state.doc,
    buildSpacerDecorations(view.state.doc, measure, showPageBreaks),
  );
  applyProseMirrorPageStyles(view, pageSetup);
  return { measure, decorations };
}

const EMPTY_STATE: PaginationPluginState = {
  measure: { pageCount: 1, pageStarts: [1], pageTops: [0], pageBreaks: [] },
  decorations: DecorationSet.empty,
};

export function createPaginationPlugin(options: PaginationPluginOptions): Plugin {
  const { pageSetup, showPageBreaks = false, enabled = true, getView } = options;

  const rebuild = (): PaginationPluginState => {
    if (!enabled) return EMPTY_STATE;
    const view = getView();
    if (!view || view.isDestroyed) return EMPTY_STATE;
    return buildPluginState(view, pageSetup, showPageBreaks);
  };

  return new Plugin({
    key: PAGINATION_PLUGIN_KEY,
    state: {
      init: () => rebuild(),
      apply: (tr, pluginState) => {
        if (!enabled) return EMPTY_STATE;
        if (!tr.docChanged && !tr.getMeta(PAGINATION_REMEASURE_META)) {
          return pluginState;
        }
        return rebuild();
      },
    },
    view(view) {
      if (!enabled) return {};

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let resizeObserver: ResizeObserver | null = null;

      const remeasure = () => {
        const sel = view.state.selection;
        view.dispatch(view.state.tr.setMeta(PAGINATION_REMEASURE_META, true));
        requestAnimationFrame(() => {
          if (view.isDestroyed) return;
          const after = view.state.selection;
          if (sel.from !== after.from || sel.to !== after.to) {
            view.dispatch(view.state.tr.setSelection(sel));
          }
        });
      };

      const scheduleRemeasure = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          remeasure();
        }, REMEASURE_DEBOUNCE_MS);
      };

      requestAnimationFrame(remeasure);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(scheduleRemeasure);
        resizeObserver.observe(view.dom);
      }

      return {
        update: () => scheduleRemeasure(),
        destroy: () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          resizeObserver?.disconnect();
          clearProseMirrorPageStyles(view);
        },
      };
    },
    props: {
      decorations(state) {
        const pluginState = PAGINATION_PLUGIN_KEY.getState(state) as PaginationPluginState | undefined;
        return pluginState?.decorations ?? DecorationSet.empty;
      },
    },
  });
}

export function readPaginationMeasure(editorView: EditorView | null): PageMeasureResult | null {
  if (!editorView) return null;
  const pluginState = PAGINATION_PLUGIN_KEY.getState(editorView.state) as PaginationPluginState | undefined;
  return pluginState?.measure ?? null;
}
