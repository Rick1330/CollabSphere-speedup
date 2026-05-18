import { describe, expect, it } from "vitest";
import {
  resolveApiOriginForBrowserRedirect,
  resolveConfiguredApiBaseUrl,
  resolveOAuthStartUrl,
} from "@/api/client";

describe("resolveOAuthStartUrl", () => {
  it("uses API origin on port 3001 even when VITE_USE_DEV_PROXY is true", () => {
    const env = import.meta.env as Record<string, string | undefined>;
    const prevProxy = env.VITE_USE_DEV_PROXY;
    const prevTarget = env.VITE_API_PROXY_TARGET;
    const prevApiBase = env.VITE_API_BASE_URL;

    env.VITE_USE_DEV_PROXY = "true";
    env.VITE_API_PROXY_TARGET = "http://127.0.0.1:3001";
    env.VITE_API_BASE_URL = "http://127.0.0.1:3001/api/v1";

    try {
      expect(resolveConfiguredApiBaseUrl()).toBe("/api/v1");
      expect(resolveApiOriginForBrowserRedirect()).toBe("http://127.0.0.1:3001");
      expect(resolveOAuthStartUrl()).toBe("http://127.0.0.1:3001/api/v1/auth/google");
    } finally {
      if (prevProxy === undefined) delete env.VITE_USE_DEV_PROXY;
      else env.VITE_USE_DEV_PROXY = prevProxy;
      if (prevTarget === undefined) delete env.VITE_API_PROXY_TARGET;
      else env.VITE_API_PROXY_TARGET = prevTarget;
      if (prevApiBase === undefined) delete env.VITE_API_BASE_URL;
      else env.VITE_API_BASE_URL = prevApiBase;
    }
  });
});
