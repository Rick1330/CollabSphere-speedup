# Phase 0 Current-State Architecture

Generated at: 2026-05-09T14:19:03.580Z

## Runtime shape
- API runtime: NestJS app with global prefix `/api/v1` in `apps/api/src/main.ts`.
- Endpoint implementation source of truth: `*.nest.controller.ts` in `apps/api/src`.
- UI API seam: `apps/web/src/api/adapters/*` over `apps/web/src/api/client`.

## Endpoint inventory
- Controllers scanned: 13
- Implemented endpoints discovered: 80
- Spec endpoints discovered: 92

## Testing surface snapshot
- Endpoints with direct HTTP-path evidence in tests: 3
- Test scan source: `tests/**/*.ts` for supertest style `/api/v1/*` invocations.

## Notes
- Parity and divergence details are in `phase0-parity-matrix.json` and `phase0-divergence-report.md`.
- This report is machine-generated from repo sources to keep drift visible.
