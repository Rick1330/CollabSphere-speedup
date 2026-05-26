# DOCX import verification checklist

## Automated

```bash
pnpm --filter @collabsphere/docx-import run test
pnpm --filter @collabsphere/web run test -- src/features/documents/lib
pnpm --filter @collabsphere/worker run test
pnpm --filter @collabsphere/worker run build
pnpm --filter @collabsphere/api run build
```

## Manual (35MB / 125-page sample)

- [ ] Redis running; `REDIS_URL` set for API and worker
- [ ] LibreOffice installed on worker host (`soffice --version`)
- [ ] API + worker share `collabsphere-docx-imports` temp directory
- [ ] Import completes in under ~2 minutes
- [ ] Browser stays responsive; progress % updates in File menu
- [ ] Document body populated (not blank after page 3)
- [ ] Typography profile `word-import` applied; page count closer to source than default 1.5 line-height
