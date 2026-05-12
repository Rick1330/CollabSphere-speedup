# Auth Context Bundle

## Purpose
Combined context for any agent working on Authentication and Authorization in CollabSphere.

## Relevant Rules (AGENTS.md)
- No password, secret, token, or PII logging.
- JWT tokens are short-lived.
- Refresh tokens are stored in secure, httpOnly cookies.
- CSRF protection is mandatory for state-changing requests.

## Domain Specs
- `docs/spec/05-features/05.1-authentication.md`
- `docs/spec/09-api-standards/09.7-auth-standards.md`

## Current State
- NestJS `AuthNestModule` is the source of truth.
- Supports: Register, Verify-Email, Login, Refresh, Logout, Logout-All, Google OAuth.
- Identity provider: Google.

## Schemas (Prisma)
- `User`: stores profile and password hash.
- `RefreshToken`: stores active sessions.
- `EmailDeliveryLog`: tracks verification and reset emails.

## Common Error Codes
- `INVALID_CREDENTIALS` (401)
- `TOKEN_EXPIRED` (401)
- `TOKEN_INVALID` (401)
- `EMAIL_NOT_VERIFIED` (403)
- `EMAIL_ALREADY_EXISTS` (409)

## Open Questions
- JWT rotation policy (AQ-006).
- 2FA/TOTP timeline (AQ-007).
