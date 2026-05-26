import { forwardRef, memo, type CSSProperties } from "react";
import { EditorContent as TiptapEditorContent, type Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/features/documents/stores/use-editor-store";
import { getPageContentBox } from "./pageSetup";
import { Ruler } from "./Ruler";
import { usePaginationPlusSync } from "./usePaginationPlusSync";
import { useFocusParagraph } from "./useFocusParagraph";
import "./pagination/pagination.css";

interface PaginatedEditorCanvasProps {
  editor: Editor | null;
  writingColumnRef?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
  isV2Template?: boolean;
  focusMode?: boolean;
  readOnly?: boolean;
  /** When false, skips PaginationPlus sync until collab Y.Doc is ready. */
  collabReady?: boolean;
}

export const PaginatedEditorCanvas = memo(forwardRef<HTMLDivElement, PaginatedEditorCanvasProps>(
  (
    {
      editor,
      writingColumnRef,
      children,
      isV2Template = false,
      focusMode = false,
      collabReady = true,
    },
    ref,
  ) => {
    const zoomLevel = useEditorStore((s) => s.zoomLevel);
    const pageSetup = useEditorStore((s) => s.pageSetup);
    const showRuler = useEditorStore((s) => s.showRuler);
    const documentPageTheme = useEditorStore((s) => s.documentPageTheme);
    const documentTypographyProfile = useEditorStore((s) => s.documentTypographyProfile);

    const { pageWidth } = getPageContentBox(pageSetup);

    usePaginationPlusSync(editor, pageSetup, !!editor && collabReady);
    useFocusParagraph(editor, focusMode && collabReady);

    const scale = zoomLevel / 100;
    const innerZoomStyle = {
      transform: `scale(${scale})`,
      transformOrigin: "top center",
    } as CSSProperties;

    const columnStyle = {
      width: pageWidth,
      maxWidth: pageWidth,
    } as CSSProperties;

    return (
      <div
        ref={ref}
        className={cn(
          "cs-paginated-canvas-outer editor-page-canvas-outer flex-1 min-h-0 overflow-y-auto relative",
          scale > 1 && "overflow-x-auto",
        )}
        data-page-theme={documentPageTheme}
        data-typography={documentTypographyProfile}
      >
        <div className="flex flex-col items-center py-6 gap-2">
          {showRuler ? (
            <Ruler pageSetup={pageSetup} zoomLevel={zoomLevel} className="shrink-0" />
          ) : null}

          <div className="cs-paginated-scale-wrap" style={innerZoomStyle}>
            <div
              ref={writingColumnRef}
              data-collab-writing-column
              className={cn(
                "cs-paginated-writing-column",
                isV2Template && "editor-page-inner--v2",
              )}
              style={columnStyle}
            >
              <TiptapEditorContent editor={editor} />
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  },
));

PaginatedEditorCanvas.displayName = "PaginatedEditorCanvas";
