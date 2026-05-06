# ADR-0002: NestJS Remains The Target API Architecture

## Status
Accepted

## Date
2026-05-06

## Context
The documentation stack, rule system, and intended backend layering all
assume a NestJS-oriented API architecture with explicit module
boundaries, guards, and composable framework structure.

The current repository state still contains a lighter TypeScript
bootstrap application in `apps/api`, with reusable helpers but without a
landed NestJS runtime.

Without a documented decision, future contributors may either:
- assume NestJS is already in place when it is not
- continue extending the bootstrap implementation indefinitely
- write code that merely imitates NestJS naming without the framework

## Decision
NestJS remains the intended API target architecture for CollabSphere.

Until the migration lands:
- contributors must not pretend NestJS is already present
- local implementation should acknowledge the bootstrap reality
- architecture-sensitive work should document whether it is
  pre-migration or post-migration behavior

The migration itself remains a foundation story rather than a hidden
background assumption.

## Consequences

### Positive
- Prevents silent drift between docs and implementation
- Preserves a stable direction for guards, modules, and service
  composition
- Gives future agents a clear answer when they detect missing framework
  prerequisites

### Negative
- Current code remains in a transitional state longer
- Contributors must explicitly reason about "target architecture" versus
  "current runtime"

## Alternatives considered

### Declare the bootstrap architecture permanent
Rejected because the surrounding documentation, modular rules, and
planned backend growth all point toward a stronger framework structure.

### Pretend the migration already happened
Rejected because it causes drift, shallow imitation of missing
frameworks, and unstable task execution.
