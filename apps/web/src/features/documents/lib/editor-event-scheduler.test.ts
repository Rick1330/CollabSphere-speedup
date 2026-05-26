import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Editor } from "@tiptap/react";
import { subscribeEditorMeta } from "./editor-event-scheduler";

function createMockEditor(docChanged = true) {
  const handlers = new Map<string, Set<() => void>>();
  return {
    isDestroyed: false,
    state: { tr: { docChanged } },
    on: vi.fn((event: string, fn: () => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(fn);
    }),
    off: vi.fn((event: string, fn: () => void) => {
      handlers.get(event)?.delete(fn);
    }),
    emit(event: string) {
      handlers.get(event)?.forEach((fn) => fn());
    },
  } as unknown as Editor;
}

describe("subscribeEditorMeta", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces rapid update events", () => {
    const editor = createMockEditor();
    const handler = vi.fn();

    subscribeEditorMeta(editor, handler, { debounceMs: 100, events: ["update"] });

    editor.emit("update");
    editor.emit("update");
    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("skips transaction when docChangedOnly and doc unchanged", () => {
    const editor = createMockEditor(false);
    const handler = vi.fn();

    subscribeEditorMeta(editor, handler, {
      events: ["transaction"],
      docChangedOnly: true,
    });

    editor.emit("transaction");
    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribes cleanly", () => {
    const editor = createMockEditor();
    const handler = vi.fn();

    const unsub = subscribeEditorMeta(editor, handler, { events: ["update"] });
    unsub();

    editor.emit("update");
    expect(handler).not.toHaveBeenCalled();
  });
});
