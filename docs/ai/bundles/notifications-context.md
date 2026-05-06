# Notifications Context Bundle

## Purpose
Fast-start context for in-app notifications, preferences, delivery
rules, and attention-routing behavior.

## Read First
- `AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/architecture/current-state.md`

## Primary code surfaces
- `apps/web/src/features/notifications/*`
- `apps/web/src/api/adapters/notifications.ts`
- notification-related schema in `packages/database/prisma/schema.prisma`

## Primary spec / execution references
- `docs/spec/04-user-flows/04.9-notifications.md`
- `docs/spec/08-data-model/08.8-notifications-preferences.md`
- `docs/agent-ref/events/README.md`

## Current implementation reality
- Notifications are a relatively strong baseline surface.
- In-app flows and preference framing exist, but richer grouping,
  push-channel, and DnD behavior are still staged improvements.

## Common risks
- Noise explosions from event spam
- Preference mismatches between dispatch rules and UI expectations
- Deep-linking users into the wrong workspace or surface

## Validation focus
- `docs/ai/skills/validation/api-contract.md`
- `docs/ai/skills/validation/ui-contract.md`
- `docs/ai/skills/validation/permissions.md`
