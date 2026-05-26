import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable && !target.closest(".ProseMirror")) return true;
  return false;
}

/**
 * Toggle focus mode with ⌘. / Ctrl+. ; Escape exits.
 */
export function useFocusModeShortcut(
  enabled: boolean,
  focusMode: boolean,
  onToggle: () => void,
  onExit: () => void,
): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "Escape" && focusMode) {
        event.preventDefault();
        onExit();
        return;
      }

      const mod = event.metaKey || event.ctrlKey;
      if (!mod || event.shiftKey || event.altKey) return;
      if (event.key !== "." && event.code !== "Period") return;

      event.preventDefault();
      onToggle();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, focusMode, onToggle, onExit]);
}
