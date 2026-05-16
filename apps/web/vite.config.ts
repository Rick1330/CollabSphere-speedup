import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
const apiOrigin = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3001";

export default defineConfig(() => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
    /** Forward same-origin `/api/v1/*` to the Nest API (global prefix matches `apps/api`). */
    proxy: {
      "/api/v1": {
        target: apiOrigin,
        changeOrigin: true,
        /** Avoid indefinite hangs if the API is down (http-proxy option). */
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
      /** Nest Socket.IO shares the API origin; same-origin dev uses this when `VITE_REALTIME_BASE_URL` is unset. */
      "/socket.io": {
        target: apiOrigin,
        changeOrigin: true,
        ws: true,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
    },
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
