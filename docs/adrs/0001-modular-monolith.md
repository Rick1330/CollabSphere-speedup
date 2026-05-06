# ADR-0001: Modular Monolith Repository Structure

## Status
Accepted

## Date
2026-05-06

## Context
CollabSphere spans multiple product surfaces and execution runtimes:
web, API, collaboration server, worker, shared packages, and database.

The repo needs:
- hard ownership boundaries
- reusable shared code
- a deployable application set
- enough separation to prevent accidental coupling

At the same time, the project is still early enough that splitting into
independently versioned services would add operational burden faster
than it adds product value.

## Decision
CollabSphere is treated as a **modular monolith workspace repo**:

- `apps/*` contain deployable runtimes
- `packages/*` contain shared libraries and owned primitives
- `docs/spec`, `docs/domains`, and `docs/agent-ref` remain the
  canonical documentation stack
- cross-surface contracts are centralized rather than duplicated

The repo favors internal modular boundaries first, operational service
splits later.

## Consequences

### Positive
- Shared types and policies can remain centralized
- Refactors across surfaces remain cheaper
- Agents and contributors can reason about one codebase at a time
- The repo can mature architecture without early distributed-systems
  overhead

### Negative
- Strong discipline is required to prevent package boundary erosion
- Runtime coupling risk remains if local AGENTS/rules are ignored
- Service extraction later will still require deliberate planning

## Alternatives considered

### Separate repos per service
Rejected for now because it increases coordination, release overhead,
and contract drift before the product has the execution maturity to
justify it.

### Single app with no package boundaries
Rejected because CollabSphere already spans enough domains that shared
libraries and local ownership boundaries are required.
