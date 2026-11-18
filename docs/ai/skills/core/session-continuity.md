# Session Continuity

## Purpose

Maintain coherent project state across session interruptions, tool changes, and context resets.

## When to Use

- Starting a new work session
- Switching between contributors or tools
- Resuming after a long gap
- Detecting that session context has degraded

## Required Inputs

- Session log directory: `docs/ai/sessions/`
- Current PR or issue handoff comments
- Last three commit messages on the working branch
- Relevant `AGENTS.md` files
- `docs/architecture/current-state.md`

## Workflow

### Starting a fresh session

1. Read `docs/architecture/current-state.md` first.
2. Read the latest session log in `docs/ai/sessions/`.
3. Read the PR description and recent handoff comments on the working issue.
4. Read `AGENTS.md` for affected modules.
5. Confirm understanding of:
   - Current branch state
   - Last completed milestone
   - Next intended action
   - Known blockers
6. State that understanding before making code changes.

### Mid-session checkpoint

Every 10–15 turns:

1. Append to the session log what changed and why.
2. Update the PR handoff if applicable.
3. Commit work in progress when the scope is bounded.

### End-of-session handoff

1. Record what is done, what is pending, and where to start next.
2. Update the PR description with the current state.
3. Update `docs/architecture/current-state.md` if the architecture changed.
4. Optionally write a focused next-session prompt.

## Dangerous Mistakes

- Starting code work without reading the session log
- Trusting session memory over written project state
- Continuing after context loss without checking earlier decisions

## When to Hand Off

Hand off when:

- The current session contradicts an earlier project rule
- Work is claimed complete but the files or checks do not support that claim
- The current file or task scope is unclear
- Context loss makes the next safe action uncertain

## Escalation

If the session log is missing or stale, record the gap and establish the current state from the code and issue or PR before continuing. If documentation disagrees with code, document the discrepancy in `docs/audit/`.
