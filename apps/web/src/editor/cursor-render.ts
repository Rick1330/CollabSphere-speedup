type CursorUser = {
  name: string;
  color: string;
};

export function renderCursor(user: CursorUser): HTMLElement {
  const caret = document.createElement("span");
  caret.style.position = "relative";
  caret.style.display = "inline-block";

  const line = document.createElement("span");
  line.style.display = "inline-block";
  line.style.borderLeft = `2px solid ${user.color}`;
  line.style.height = "1.2em";
  line.style.marginLeft = "-1px";
  line.style.marginRight = "-1px";

  const label = document.createElement("span");
  label.textContent = user.name;
  label.style.position = "absolute";
  label.style.left = "0";
  label.style.top = "-1.35em";
  label.style.transform = "translateX(-2px)";
  label.style.backgroundColor = user.color;
  label.style.color = "#fff";
  label.style.fontSize = "10px";
  label.style.fontWeight = "600";
  label.style.padding = "2px 6px";
  label.style.borderRadius = "6px";
  label.style.whiteSpace = "nowrap";
  label.style.pointerEvents = "none";

  caret.append(line, label);
  return caret;
}

