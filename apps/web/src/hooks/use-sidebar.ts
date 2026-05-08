import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cs.sidebar.collapsed";
const WIDTH_STORAGE_KEY = "cs.sidebar.width";
const MIN_WIDTH = 240;
const MAX_WIDTH = 360;

export function useSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 260;
    const saved = Number(window.localStorage.getItem(WIDTH_STORAGE_KEY));
    return Number.isFinite(saved) && saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : 260;
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
  }, [width]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  const resize = useCallback((nextWidth: number) => {
    setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, nextWidth)));
  }, []);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (collapsed) return;
      const startX = event.clientX;
      const startWidth = width;
      const onMove = (moveEvent: PointerEvent) => {
        resize(startWidth + (moveEvent.clientX - startX));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [collapsed, resize, width],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return { collapsed, toggle, setCollapsed, width, setWidth: resize, startResize };
}
