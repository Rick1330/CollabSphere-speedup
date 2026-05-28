import { create } from "zustand";
import {
  DEFAULT_PAGE_SETUP,
  normalizePageSetup,
  type PageFormat,
  type PageSetup,
} from "@/components/editor/canvas/pageSetup";

export type PageWidth = "normal" | "wide" | "full";
export type LeftSidebarTab =
  | "files"
  | "pages"
  | "outline"
  | "bookmarks"
  | "stats"
  | "review"
  | "submissions";
export type DocumentPageTheme = "light" | "dark";
export type DocumentTypographyProfile = "editor" | "word-import";
export type RightSidebarTab = "comments" | "team" | "tasks" | "activity";

export interface PageHeaderFooter {
  header: string;
  footer: string;
}

const PAGE_WIDTH_STORAGE_KEY = "cs_editor_page_width";
const LEFT_SIDEBAR_TAB_STORAGE_KEY = "cs_editor_left_sidebar_tab";
const RIGHT_SIDEBAR_TAB_STORAGE_KEY = "cs_editor_right_sidebar_tab";
const ZOOM_LEVEL_STORAGE_KEY = "cs_editor_zoom_level";
const PAGE_FORMAT_STORAGE_KEY = "cs_editor_page_format";
const PAGE_SETUP_STORAGE_KEY = "cs_editor_page_setup";
const SHOW_RULER_STORAGE_KEY = "cs_editor_show_ruler";
const SHOW_PAGE_BREAKS_STORAGE_KEY = "cs_editor_show_page_breaks";
const HEADER_FOOTER_STORAGE_KEY = "cs_editor_header_footer";
const DOCUMENT_PAGE_THEME_KEY = "cs_editor_page_theme";

export type DocumentBookmark = {
  id: string;
  label: string;
  createdAt: number;
};

export const ZOOM_MIN = 25;
export const ZOOM_MAX = 400;
export const ZOOM_STEP = 10;
export const ZOOM_PRESETS = [50, 75, 100, 125, 150, 200] as const;

const PAGE_WIDTH_MAX: Record<PageWidth, string> = {
  normal: "800px",
  wide: "1100px",
  full: "100%",
};

function readStoredPageWidth(): PageWidth {
  if (typeof window === "undefined") return "normal";
  const stored = window.localStorage.getItem(PAGE_WIDTH_STORAGE_KEY);
  if (stored === "wide" || stored === "full") return stored;
  return "normal";
}

function readStoredLeftSidebarTab(): LeftSidebarTab {
  if (typeof window === "undefined") return "files";
  const stored = window.localStorage.getItem(LEFT_SIDEBAR_TAB_STORAGE_KEY);
  if (
    stored === "pages" ||
    stored === "outline" ||
    stored === "bookmarks" ||
    stored === "stats" ||
    stored === "review" ||
    stored === "submissions"
  ) {
    return stored;
  }
  return "files";
}

function readStoredDocumentPageTheme(): DocumentPageTheme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(DOCUMENT_PAGE_THEME_KEY);
  return stored === "dark" ? "dark" : "light";
}

function readStoredRightSidebarTab(): RightSidebarTab {
  if (typeof window === "undefined") return "comments";
  const stored = window.localStorage.getItem(RIGHT_SIDEBAR_TAB_STORAGE_KEY);
  if (
    stored === "team" ||
    stored === "tasks" ||
    stored === "activity" ||
    stored === "comments"
  ) {
    return stored;
  }
  return "comments";
}

function clampZoom(level: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(level)));
}

function readStoredZoomLevel(): number {
  if (typeof window === "undefined") return 100;
  const stored = window.localStorage.getItem(ZOOM_LEVEL_STORAGE_KEY);
  if (!stored) return 100;
  const parsed = Number.parseInt(stored, 10);
  if (Number.isNaN(parsed)) return 100;
  return clampZoom(parsed);
}

function readStoredPageFormat(): PageFormat {
  if (typeof window === "undefined") return DEFAULT_PAGE_SETUP.format;
  const stored = window.localStorage.getItem(PAGE_FORMAT_STORAGE_KEY);
  if (stored === "letter" || stored === "a4" || stored === "legal") return stored;
  return DEFAULT_PAGE_SETUP.format;
}

function readStoredPageSetup(): PageSetup {
  if (typeof window === "undefined") return DEFAULT_PAGE_SETUP;
  try {
    const raw = window.localStorage.getItem(PAGE_SETUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PageSetup>;
      return normalizePageSetup(parsed);
    }
  } catch {
    /* fall through */
  }
  return normalizePageSetup({ format: readStoredPageFormat() });
}

function persistPageSetup(setup: PageSetup): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PAGE_SETUP_STORAGE_KEY, JSON.stringify(setup));
  window.localStorage.setItem(PAGE_FORMAT_STORAGE_KEY, setup.format);
}

function readStoredBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  const stored = window.localStorage.getItem(key);
  if (stored === null) return defaultValue;
  return stored === "true";
}

function readStoredHeaderFooter(): Record<number, PageHeaderFooter> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(HEADER_FOOTER_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PageHeaderFooter>;
    const result: Record<number, PageHeaderFooter> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const page = Number.parseInt(key, 10);
      if (!Number.isNaN(page) && value) {
        result[page] = {
          header: value.header ?? "",
          footer: value.footer ?? "",
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

interface EditorStore {
  pageWidth: PageWidth;
  setPageWidth: (width: PageWidth) => void;
  hydratePageWidth: () => void;
  leftSidebarTab: LeftSidebarTab;
  setLeftSidebarTab: (tab: LeftSidebarTab) => void;
  hydrateLeftSidebarTab: () => void;
  rightSidebarTab: RightSidebarTab;
  setRightSidebarTab: (tab: RightSidebarTab) => void;
  hydrateRightSidebarTab: () => void;
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  hydrateZoomLevel: () => void;
  pageFormat: PageFormat;
  setPageFormat: (format: PageFormat) => void;
  pageSetup: PageSetup;
  setPageSetup: (setup: PageSetup) => void;
  hydratePageSetup: () => void;
  showRuler: boolean;
  setShowRuler: (show: boolean) => void;
  toggleRuler: () => void;
  showPageBreaks: boolean;
  setShowPageBreaks: (show: boolean) => void;
  toggleShowPageBreaks: () => void;
  headerFooterByPage: Record<number, PageHeaderFooter>;
  setPageHeaderFooter: (page: number, patch: Partial<PageHeaderFooter>) => void;
  paginationPageCount: number;
  paginationPageTops: number[];
  paginationCurrentPage: number;
  setPaginationMeta: (
    pageCount: number,
    pageTops: number[],
    currentPage?: number,
  ) => void;
  documentPageTheme: DocumentPageTheme;
  setDocumentPageTheme: (theme: DocumentPageTheme) => void;
  hydrateDocumentPageTheme: () => void;
  /** Word-like typography after DOCX import; native docs use `editor`. */
  documentTypographyProfile: DocumentTypographyProfile;
  setDocumentTypographyProfile: (profile: DocumentTypographyProfile) => void;
  documentBookmarks: DocumentBookmark[];
  addDocumentBookmark: (label: string) => void;
  removeDocumentBookmark: (id: string) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  pageWidth: readStoredPageWidth(),
  setPageWidth: (width) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PAGE_WIDTH_STORAGE_KEY, width);
    }
    set({ pageWidth: width });
  },
  hydratePageWidth: () => set({ pageWidth: readStoredPageWidth() }),
  leftSidebarTab: readStoredLeftSidebarTab(),
  setLeftSidebarTab: (tab) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LEFT_SIDEBAR_TAB_STORAGE_KEY, tab);
    }
    set({ leftSidebarTab: tab });
  },
  hydrateLeftSidebarTab: () => set({ leftSidebarTab: readStoredLeftSidebarTab() }),
  rightSidebarTab: readStoredRightSidebarTab(),
  setRightSidebarTab: (tab) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RIGHT_SIDEBAR_TAB_STORAGE_KEY, tab);
    }
    set({ rightSidebarTab: tab });
  },
  hydrateRightSidebarTab: () => set({ rightSidebarTab: readStoredRightSidebarTab() }),
  zoomLevel: readStoredZoomLevel(),
  setZoomLevel: (level) => {
    const clamped = clampZoom(level);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ZOOM_LEVEL_STORAGE_KEY, String(clamped));
    }
    set({ zoomLevel: clamped });
  },
  zoomIn: () => {
    const current = get().zoomLevel;
    get().setZoomLevel(current + ZOOM_STEP);
  },
  zoomOut: () => {
    const current = get().zoomLevel;
    get().setZoomLevel(current - ZOOM_STEP);
  },
  resetZoom: () => {
    get().setZoomLevel(100);
  },
  hydrateZoomLevel: () => set({ zoomLevel: readStoredZoomLevel() }),
  pageFormat: readStoredPageSetup().format,
  pageSetup: readStoredPageSetup(),
  setPageFormat: (format) => {
    const next = normalizePageSetup({ ...get().pageSetup, format });
    persistPageSetup(next);
    set({ pageFormat: format, pageSetup: next });
  },
  setPageSetup: (setup) => {
    const next = normalizePageSetup(setup);
    persistPageSetup(next);
    set({ pageFormat: next.format, pageSetup: next });
  },
  hydratePageSetup: () => {
    const setup = readStoredPageSetup();
    set({ pageFormat: setup.format, pageSetup: setup });
  },
  showRuler: readStoredBoolean(SHOW_RULER_STORAGE_KEY, false),
  setShowRuler: (show) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SHOW_RULER_STORAGE_KEY, String(show));
    }
    set({ showRuler: show });
  },
  toggleRuler: () => {
    const next = !get().showRuler;
    get().setShowRuler(next);
  },
  showPageBreaks: readStoredBoolean(SHOW_PAGE_BREAKS_STORAGE_KEY, false),
  setShowPageBreaks: (show) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SHOW_PAGE_BREAKS_STORAGE_KEY, String(show));
    }
    set({ showPageBreaks: show });
  },
  toggleShowPageBreaks: () => {
    const next = !get().showPageBreaks;
    get().setShowPageBreaks(next);
  },
  headerFooterByPage: readStoredHeaderFooter(),
  setPageHeaderFooter: (page, patch) => {
    const prev = get().headerFooterByPage[page] ?? { header: "", footer: "" };
    const nextEntry = { ...prev, ...patch };
    const headerFooterByPage = { ...get().headerFooterByPage, [page]: nextEntry };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        HEADER_FOOTER_STORAGE_KEY,
        JSON.stringify(headerFooterByPage),
      );
    }
    set({ headerFooterByPage });
  },
  paginationPageCount: 1,
  paginationPageTops: [0],
  paginationCurrentPage: 1,
  setPaginationMeta: (pageCount, pageTops, currentPage) => {
    set({
      paginationPageCount: Math.max(1, pageCount),
      paginationPageTops: pageTops.length > 0 ? pageTops : [0],
      paginationCurrentPage: currentPage ?? get().paginationCurrentPage,
    });
  },
  documentPageTheme: readStoredDocumentPageTheme(),
  setDocumentPageTheme: (theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DOCUMENT_PAGE_THEME_KEY, theme);
    }
    set({ documentPageTheme: theme });
  },
  hydrateDocumentPageTheme: () => set({ documentPageTheme: readStoredDocumentPageTheme() }),
  documentTypographyProfile: "editor",
  setDocumentTypographyProfile: (profile) => set({ documentTypographyProfile: profile }),
  documentBookmarks: [],
  addDocumentBookmark: (label) => {
    const entry: DocumentBookmark = {
      id: `bm-${Date.now()}`,
      label: label.trim() || "Bookmark",
      createdAt: Date.now(),
    };
    set({ documentBookmarks: [...get().documentBookmarks, entry] });
  },
  removeDocumentBookmark: (id) => {
    set({ documentBookmarks: get().documentBookmarks.filter((b) => b.id !== id) });
  },
}));

export function getEditorMaxWidthCss(pageWidth: PageWidth): string {
  return PAGE_WIDTH_MAX[pageWidth];
}

export type { PageFormat } from "@/components/editor/canvas/pageSetup";

export function substituteHeaderFooterTokens(
  template: string,
  page: number,
  total: number,
): string {
  return template
    .replace(/\{page\}/g, String(page))
    .replace(/\{total\}/g, String(total));
}
