let editorScrollContainer: HTMLElement | null = null;

export function setEditorScrollContainer(element: HTMLElement | null): void {
  editorScrollContainer = element;
}

export function getEditorScrollContainer(): HTMLElement | null {
  return editorScrollContainer;
}
