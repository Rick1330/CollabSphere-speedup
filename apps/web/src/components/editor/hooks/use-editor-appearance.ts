import { useEffect, useState } from "react";

const APPEARANCE_KEY = "cs-appearance";

/**
 * Editor chrome is light by default. Dark only when user explicitly sets
 * localStorage `cs-appearance` to `"dark"` (not from OS prefers-color-scheme).
 */
export function useEditorChromeDark(): boolean {
  const [dark, setDark] = useState(() => readChromeDark());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === APPEARANCE_KEY) setDark(readChromeDark());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return dark;
}

function readChromeDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(APPEARANCE_KEY) === "dark";
}
