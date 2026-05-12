# Performance Validation
## Purpose
Prevent performance regressions and ensure the application remains snappy at scale.
## Thresholds
- **API Latency**: P95 < 200ms for read operations; < 500ms for complex writes.
- **Bundle Size**: Initial JS payload for the web app < 250KB (gzipped).
- **TTI (Time to Interactive)**: < 2s on desktop; < 5s on mobile (3G simulated).
- **Prisma Queries**: No N+1 query patterns; use `$transaction` for bulk writes; ensure indices exist for all filtered columns.
## Workflow
1. Use browser DevTools (Network tab) to check request times.
2. Run `pnpm build:web` to see bundle size analysis.
3. Check the API logs for "long-running query" warnings.
