# Auth Context Bundle

## Purpose
Starting context for work touching registration, verification, login,
session, and auth-adjacent API behavior.

## Read First
- `AGENTS.md`
- `apps/api/AGENTS.md`
- `docs/architecture/current-state.md`
- `docs/adrs/0002-nestjs-migration.md`
- `docs/adrs/0003-verify-email-token-http-mapping.md`

## Primary code surfaces
- `apps/api/src/auth/*`
- `apps/web/src/features/auth/*`
- `packages/shared/src/queues/*`
- `tests/unit/api-auth-*.test.ts`

## Primary spec / execution references
- `docs/spec/05-features/05.1-authentication.md`
- `docs/spec/09-api-standards/*`
- `docs/spec/11-security/*`
- `docs/agent-ref/api/auth-endpoints.md`
- `docs/agent-ref/rules/error-codes.md`
- `docs/agent-ref/rules/security-rules.md`

## Current implementation reality
- Auth is present as a repo surface, but the API runtime is still in the
  pre-NestJS architecture state.
- Registration and email verification behavior are implemented and
  tested more concretely than many other backend surfaces.
- The verify-email token mapping has a documented local ADR-backed
  override.

## Common risks
- Token status-code churn caused by stale catalog assumptions
- Secret/token leakage in logs
- Session and email flows implemented differently across surfaces
- Assuming NestJS guards/modules are already landed

## Validation focus
- `docs/ai/skills/validation/api-contract.md`
- `docs/ai/skills/validation/permissions.md`
- `docs/ai/skills/validation/edge-cases.md`

## Open questions to respect
- Production email and deploy verification remain operational concerns
- Broader auth expansion (OAuth, MFA, SSO) is not the same thing as the
  current registration/verification surface
