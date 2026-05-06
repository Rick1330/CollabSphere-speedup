# ADR-0003: Verify-Email Token Error HTTP Mapping

## Status
Accepted

## Date
2026-05-06

## Context
The broader canonical error-code catalog and earlier planning artifacts
expected different HTTP mappings for token-related auth failures.

The `/verify-email` flow in the codebase intentionally uses a more
specific mapping:
- invalid token -> `400`
- expired token -> `410`

Without an ADR, future contributors and agents will repeatedly "fix"
this endpoint back toward the older catalog expectation even though the
current behavior is intentional.

## Decision
For the verify-email surface:

- `TOKEN_INVALID` maps to HTTP `400`
- `TOKEN_EXPIRED` maps to HTTP `410`

These endpoint-specific mappings are canonical for this surface until a
future ADR supersedes them.

## Consequences

### Positive
- Clarifies client behavior for malformed versus no-longer-valid tokens
- Prevents repeated churn from rule/code mismatch
- Establishes the pattern that documented local overrides are valid when
  intentional

### Negative
- Adds a local exception to the broader catalog expectations
- Requires agents to read ADRs rather than relying only on a central
  error list

## Alternatives considered

### Force both cases back to the older catalog mapping
Rejected because it hides an intentional product distinction and
reintroduces drift between implementation and expectation.

### Leave the difference undocumented
Rejected because undocumented divergence is exactly the failure mode
this governance layer is meant to stop.
