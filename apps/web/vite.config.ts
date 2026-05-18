import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
const repoRoot = path.resolve(__dirname, "../..");

/** Redirect http://localhost:8080 → http://127.0.0.1:8080 so SPA Origin matches canonical WEB_APP_URL. */
function localhostToIpv4Redirect(): Plugin {
  return {
    name: "localhost-to-ipv4-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const host = req.headers.host ?? "";
        if (!host.startsWith("localhost:")) {
          next();
          return;
        }
        const incoming = req.url ?? "/";
        const target = new URL(incoming, `http://${host}`);
        target.hostname = "127.0.0.1";
        res.writeHead(302, { Location: target.toString() });
        res.end();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, "");
  const apiOrigin =
    env.VITE_API_PROXY_TARGET?.trim() ||
    (() => {
      const apiBase = env.API_BASE_URL?.trim();
      if (apiBase) {
        try {
          return new URL(apiBase).origin;
        } catch {
          /* fall through */
        }
      }
      return "http://127.0.0.1:3001";
    })();

  return {
    envDir: repoRoot,
    server: {
      host: "127.0.0.1",
      port: 8080,
      strictPort: true,
      /** Forward same-origin `/api/v1/*` to the Nest API (global prefix matches `apps/api`). */
      proxy: {
        "/api/v1": {
          target: apiOrigin,
          changeOrigin: true,
          timeout: 60_000,
          proxyTimeout: 60_000,
        },
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
    plugins: [localhostToIpv4Redirect(), react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
  };
});
