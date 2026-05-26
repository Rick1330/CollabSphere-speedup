import { lazy, Suspense, type ComponentType } from "react";
import { RouteLoadingFallback } from "./route-loading-fallback";

/**
 * Wraps `React.lazy` with a route-level Suspense boundary so eager route tables
 * do not pull entire feature graphs on first paint.
 */
export function lazyPage<T extends ComponentType<object>>(
  factory: () => Promise<{ default: T }>,
) {
  const Lazy = lazy(factory);
  return function LazyPageRoute(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
