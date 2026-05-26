import type { ReactNode } from "react";
import { cn } from "@/components/ui-kit/cn";
import { ResizeHandle } from "@/components/ui-kit/ResizeHandle";
import "./editor-shell.css";

export type EditorShellProps = {
  focusMode?: boolean;
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
  rightPanelWidth?: number;
  onRightPanelResizeStart?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  topBar: ReactNode;
  menuBar: ReactNode;
  toolbar: ReactNode;
  statusBar: ReactNode;
  leftRail: ReactNode;
  leftPanel: ReactNode;
  rightRail: ReactNode;
  rightPanel: ReactNode;
  banners?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function EditorShell({
  focusMode = false,
  leftPanelOpen = true,
  rightPanelOpen = true,
  rightPanelWidth,
  onRightPanelResizeStart,
  topBar,
  menuBar,
  toolbar,
  statusBar,
  leftRail,
  leftPanel,
  rightRail,
  rightPanel,
  banners,
  children,
  className,
}: EditorShellProps) {
  const rightStyle =
    rightPanelWidth != null
      ? ({ ["--right-panel-w" as string]: `${rightPanelWidth}px` } as React.CSSProperties)
      : undefined;

  return (
    <div
      className={cn("cs-editor-shell", focusMode && "cs-editor-shell--focus", className)}
      data-focus-mode={focusMode ? "true" : undefined}
    >
      <div className="cs-editor-shell__row cs-editor-shell__topbar">{topBar}</div>
      <div className="cs-editor-shell__row cs-editor-shell__menubar">{menuBar}</div>
      <div className="cs-editor-shell__row cs-editor-shell__toolbar-row">{toolbar}</div>

      <div className="cs-editor-shell__main">
        <div className="cs-editor-shell__left-rail hidden lg:flex" aria-label="Left sidebar rail">
          {leftRail}
        </div>
        <div
          className={cn(
            "cs-editor-shell__left-panel hidden lg:block",
            leftPanelOpen ? "cs-editor-shell__left-panel--open" : "cs-editor-shell__left-panel--closed",
          )}
          aria-hidden={!leftPanelOpen}
        >
          {leftPanel}
        </div>

        <div className="cs-editor-shell__canvas">
          <div className="cs-editor-shell__canvas-inner">
            {banners}
            {children}
          </div>
        </div>

        <div
          className="cs-editor-shell__right-panel-wrap hidden lg:flex"
          style={rightStyle}
          aria-hidden={!rightPanelOpen}
        >
          <div
            className={cn(
              "cs-editor-shell__right-panel",
              rightPanelOpen ? "cs-editor-shell__right-panel--open" : "cs-editor-shell__right-panel--closed",
            )}
          >
            {rightPanel}
          </div>
          {onRightPanelResizeStart && rightPanelOpen && !focusMode ? (
            <ResizeHandle
              className="cs-editor-shell__resize-handle"
              aria-label="Resize context panel"
              onPointerDown={onRightPanelResizeStart}
            />
          ) : null}
        </div>
        <div className="cs-editor-shell__right-rail hidden lg:flex" aria-label="Right sidebar rail">
          {rightRail}
        </div>
      </div>

      <div className="cs-editor-shell__row cs-editor-shell__statusbar">{statusBar}</div>
    </div>
  );
}
