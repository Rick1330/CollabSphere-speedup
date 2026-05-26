import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable && !target.closest(".ProseMirror")) return true;
  return false;
}

/** Ctrl+Shift+H (Cmd+Shift+H on Mac) opens version history from the document editor. */
export function useEditorVersionHistoryShortcuts(
  enabled: boolean,
  onOpen: () => void,
): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod || !event.shiftKey || event.key.toLowerCase() !== "h") return;
      if (event.altKey) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      onOpen();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onOpen]);
}
