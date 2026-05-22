# Collab (Hocuspocus)

## Default dev entry (Path A)

`pnpm dev` (package and root `scripts/dev.ts`) runs **`src/main.ts`**:

- Extensions: `auth.extension.ts`, `persistence.extension.ts`
- Startup log: **`[collab] Server listening on port …`**
- Health: `http://127.0.0.1:3002/health` → `{"service":"collab","status":"ok","mode":"hocuspocus"}`

## Alternate entry (Path B — not default)

`pnpm run dev:legacy` runs **`src/dev.ts`** → `hocuspocus-server.ts`:

- JSON logs: `collab.authenticate.ok`, `collab.document.load`
- Startup log: **`[collab] bootstrap listening`**
- `onLoadDocument` returns empty state when DB row missing (less strict than Path A)

Use one path in docs and fixes; do not mix log expectations between A and B.

## WebSocket URL (browser)

- Set `VITE_COLLAB_WS_URL=ws://127.0.0.1:3002` in repo root `.env` (see `.env.example`).
- Hocuspocus v4 listens on the TCP port root (`COLLAB_PORT`, default **3002**); do not use the SPA route `/w/.../documents/...` as the WebSocket URL.
- If the WS handshake fails, confirm the URL has no extra path segment and restart Vite after changing `.env`.
