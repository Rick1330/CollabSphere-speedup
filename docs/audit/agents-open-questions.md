# Agents Open Questions

## Purpose
This file is the formal holding area for unresolved policy, execution,
or architecture questions discovered during implementation.

If an agent cannot find a canonical answer in:
- `docs/spec/`
- `docs/domains/`
- `docs/agent-ref/`
- `AGENTS.md`
- local ADRs

the unresolved item should be logged here instead of being silently
invented in code.

## Status scale
- `open` — unresolved and needs an owner
- `tracking` — a likely answer exists but is not yet canonical
- `resolved` — documented elsewhere; keep until next pruning pass

## Open items

### AQ-001: Deployment approval workflow
- Status: `open`
- Surface: deploy / release ops
- Question: Is production deployment manually approved, tag-gated, or
  workflow-driven by environment protection rules?
- Why it matters: automation and incident docs depend on a single
  canonical answer.
- Likely references: `DEPLOYMENT.md`, `.github/workflows/deploy*.yml`

### AQ-002: Backup retention and recovery objective
- Status: `open`
- Surface: database / operations
- Question: What are the intended backup retention windows and restore
  expectations for staging and production?
- Why it matters: docs mention safety posture, but operational runbooks
  are still incomplete.

### AQ-003: Connection pooling strategy
- Status: `open`
- Surface: API / database / deploy
- Question: What is the intended connection-pooling strategy per
  environment, beyond default client settings?
- Why it matters: scaling and deployment choices depend on it.

### AQ-004: Collab rollout gate
- Status: `tracking`
- Surface: realtime collaboration
- Question: What exact criteria must be met before collaborative editing
  is treated as production-ready rather than bootstrap-only?
- Why it matters: Hocuspocus/Yjs changes are high-risk without explicit
  rollout rules.

### AQ-005: File-upload hardening order
- Status: `tracking`
- Surface: files / editor / review
- Question: Which must land first: minimal upload path, previews,
  scanning, or versioning?
- Why it matters: multiple feature arcs depend on files, but the safe
  order should be explicit.
