type CursorUser = {
  name: string;
  color: string;
};

/** Remote caret widget for @tiptap/extension-collaboration-cursor (y-prosemirror). */
export function renderCursor(user: CursorUser): HTMLElement {
  const caret = document.createElement("span");
  caret.classList.add("collaboration-cursor__caret");
  caret.style.display = "inline-block";
  caret.style.width = "0";
  caret.style.height = "1.25em";
  caret.style.verticalAlign = "text-bottom";
  caret.style.borderLeft = `3px solid ${user.color}`;
  caret.style.boxShadow = `0 0 0 1px ${user.color}33, 0 0 6px ${user.color}55`;
  caret.style.pointerEvents = "none";

  const label = document.createElement("span");
  label.classList.add("collaboration-cursor__label");
  label.textContent = user.name;
  label.style.backgroundColor = user.color;

  caret.append(label);
  return caret;
}
