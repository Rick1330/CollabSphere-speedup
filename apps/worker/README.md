# CollabSphere Worker (NestJS + BullMQ)

## Requirements

- **Redis** — BullMQ job queues (`REDIS_URL`)
- **LibreOffice** — headless `soffice` for DOCX → HTML and PDF export (`LIBREOFFICE_PATH` optional)

## Run locally

```bash
pnpm --filter @collabsphere/worker run dev
```

With full stack (recommended): set `DEV_WORKER_DOCKER=0` in `.env` and run `pnpm dev` from the repo root — API, web, collab, and **host worker** start together.

Legacy plain BullMQ entry (deprecated):

```bash
pnpm --filter @collabsphere/worker run dev:legacy
```

## DOCX import

1. API writes uploads to `DOCX_IMPORT_TMP_DIR/{importJobId}.docx` (resolved at runtime from env)
2. Worker converts via LibreOffice, builds TipTap JSON with `@collabsphere/docx-import`
3. Embedded and inline `data:` images upload to storage (local `./uploads` or MinIO/S3)
4. Result stored as `{importJobId}.result.json.gz` (not in Redis)
5. Client polls `GET .../import/docx/:importJobId` for progress and JSON content

**Retries and temp files:** BullMQ may retry failed imports up to 3 times. The worker keeps `{importJobId}.docx` on disk until the job succeeds or exhausts all attempts (it no longer deletes the file on the first error). If you see `ENOENT` with a listing of *other* UUIDs, an earlier attempt likely failed and removed the wrong file before this fix, or API/worker `DOCX_IMPORT_TMP_DIR` differ.

### Recommended: host worker on Windows (`DEV_WORKER_DOCKER=0`)

Postgres, Redis, and MinIO stay in Docker (`docker compose up`). The **worker and LibreOffice run on the host** so DOCX files are read from the same disk path as the API — no bind-mount issues.

**Port conflicts:** If another stack (e.g. `collabsphere-repo-main-redis-1`) already uses 6379, 5432, or 9000, `pnpm dev` fails before starting apps. Stop those containers (`docker ps`, then `docker stop <name>`) or use `pnpm dev --skip-compose` when this project's `collabsphere-redis` / `collabsphere-postgres` / `collabsphere-minio` are already running.

**First-time setup:**

```powershell
# 1. .env (repo root)
#    DEV_WORKER_DOCKER=0
#    DOCX_IMPORT_TMP_DIR=D:\collabsphere-data\docx-imports
#    DOCX_IMPORT_HOST_PATH=D:\collabsphere-data\docx-imports
#    LIBREOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe

New-Item -Path "D:\collabsphere-data\docx-imports" -ItemType Directory -Force

# 2. LibreOffice
winget install TheDocumentFoundation.LibreOffice
& "C:\Program Files\LibreOffice\program\soffice.exe" --version

# 3. Stop any Docker worker so it does not steal jobs (do NOT use compose down — it removes Postgres/Redis)
docker rm -f collabsphere-worker

# 4. Start dev (single terminal — worker is included)
pnpm dev

# 5. If import still fails
pnpm exec tsx scripts/diagnose-docx-import.mts
```

`pnpm dev` with `DEV_WORKER_DOCKER=0` removes only the `collabsphere-worker` container (`docker rm -f`; optionally `compose stop worker`). It does **not** tear down Postgres, Redis, or MinIO from the main `docker-compose.yml`. It verifies LibreOffice (relaxed on Windows: non-zero `--version` exit is OK if the binary exists), starts the host worker, and waits until the process stays alive. In the **same** terminal you should see `Worker server is running (BullMQ processors active)` and, on import, `DOCX import ... complete`.

Use the **same** `DOCX_IMPORT_TMP_DIR` for API and worker (injected automatically by `pnpm dev`). On worker startup (dev) you should see `DOCX import worker tmpDir=...` matching the API `DOCX import temp directory` line. The worker prefers `inputPath` from the queued job payload when the file exists on disk.

### Optional: Docker worker (`DEV_WORKER_DOCKER=1`)

For machines without local LibreOffice, the worker can run in Docker with LibreOffice in the image.

- Set **`DOCX_IMPORT_TMP_DIR`** and **`DOCX_IMPORT_HOST_PATH`** to the **same host folder**
- Enable that drive in Docker Desktop → Settings → Resources → File sharing
- Do **not** run a host worker while `DEV_WORKER_DOCKER=1`
- Rebuild only when needed: `pnpm dev --build-worker`
- Verify mount: `pnpm exec tsx scripts/verify-docx-mount.mts`

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://127.0.0.1:6379` | BullMQ connection |
| `STORAGE_TYPE` | `local` | `local` or `s3` for embedded images |
| `STORAGE_LOCAL_PATH` | `./uploads` | Local image storage root (API serves `/uploads`) |
| `API_BASE_URL` | `http://localhost:3001` | Base URL for local image links |
| `S3_ENDPOINT` | — | MinIO API URL, e.g. `http://127.0.0.1:9000` |
| `S3_BUCKET` / `AWS_S3_BUCKET` | — | Bucket name (e.g. `documents`) |
| `S3_ACCESS_KEY_ID` / `AWS_ACCESS_KEY_ID` | — | MinIO access key |
| `S3_SECRET_ACCESS_KEY` / `AWS_SECRET_ACCESS_KEY` | — | MinIO secret key |
| `S3_REGION` / `AWS_REGION` | `us-east-1` | S3 region (required by SDK) |
| `LIBREOFFICE_PATH` | auto-detect | Path to `soffice` binary (required for host worker on Windows) |
| `DEV_WORKER_DOCKER` | `0` | `0` = host worker; `1` = Docker worker |

### LibreOffice (Windows)

```powershell
winget install TheDocumentFoundation.LibreOffice
& "C:\Program Files\LibreOffice\program\soffice.exe" --version

# In repo .env:
LIBREOFFICE_PATH=C:\Program Files\LibreOffice\program\soffice.exe
```

### MinIO (local via root `docker-compose.yml`)

- API: `http://127.0.0.1:9000`
- Console: `http://127.0.0.1:9001` — login with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` from `.env`
- `MINIO_ROOT_USER` must equal `S3_ACCESS_KEY_ID` (and root password equals `S3_SECRET_ACCESS_KEY`); MinIO uses the root account as the S3 access key
- Set `STORAGE_TYPE=s3` and `S3_*` in repo root `.env` to store DOCX images in MinIO (use `pnpm dev` so the worker gets the same env)
- Verify: `pnpm diagnose:minio` — worker logs `MinIO connection verified` on startup when S3 is configured
- **InvalidAccessKeyId:** often another MinIO container owns port 9000 (e.g. `collabsphere-repo-minio-1` with `minioadmin`). Run `pnpm diagnose:minio` — it checks that `collabsphere-minio` publishes `${MINIO_API_PORT}`. Fix: `docker stop collabsphere-repo-minio-1` (or whichever container owns 9000), then `docker compose up -d minio`. If credentials on the volume are stale: `docker exec collabsphere-minio printenv MINIO_ROOT_USER MINIO_ROOT_PASSWORD` and align `.env`, or reset `minio_data` volume
- **Workaround:** `STORAGE_TYPE=local` stores images under `STORAGE_LOCAL_PATH` so DOCX import can complete without MinIO

## Docker Compose (optional worker only)

```bash
docker compose -f docker-compose.worker.yml up -d
```

Or `DEV_WORKER_DOCKER=1` and `pnpm dev`.

Full local stack (Postgres, Redis, MailHog, MinIO):

```bash
docker compose up -d --wait
```

## Manual verification (35MB DOCX)

1. Start Redis, API, worker, and LibreOffice on the worker host
2. Open a document in the web app with workspace + document IDs
3. Import a large DOCX (>5MB); menu shows progress %
4. Confirm no browser freeze; page count reasonable with `word-import` typography
5. Check MinIO console or `./uploads/{documentId}/images/` for extracted images

## Bloated Y.Doc diagnostics

```bash
pnpm exec tsx scripts/shrink-content-yjs-images.mts
pnpm exec tsx scripts/shrink-content-yjs-images.mts --document-id <uuid>
```

API (dev only): `GET /api/v1/workspaces/:workspaceId/documents/:documentId/debug/ydoc-size`
