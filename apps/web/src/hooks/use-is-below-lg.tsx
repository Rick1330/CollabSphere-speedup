import * as React from "react";

/** Tailwind `lg` breakpoint — panels switch to Sheet below this width. */
const LG_BREAKPOINT = 1024;

export function useIsBelowLg() {
  const [isBelowLg, setIsBelowLg] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsBelowLg(window.innerWidth < LG_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsBelowLg(window.innerWidth < LG_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isBelowLg;
}
