# Session Continuity

## Purpose
Preserve working context across long-running, interrupted, or
tool-switched sessions so later contributors do not have to reconstruct
state from scratch.

## When to Use
- Any non-trivial implementation session
- Any task expected to span multiple tool runs or days
- Any time a handoff between tools or contributors is required

## Required Inputs / Context
- `docs/architecture/current-state.md`
- Most recent session log in `docs/ai/sessions/`
- Relevant ADRs and local `AGENTS.md`

## Read First
- `AGENTS.md`
- `docs/architecture/current-state.md`
- Most recent session log
- Relevant domain bundle in `docs/ai/bundles/`

## Workflow
1. At session start, read current-state, the latest session log, and
   the relevant domain bundle.
2. Confirm whether the repo reality still matches the handoff
   assumptions.
3. During long sessions, checkpoint important findings rather than
   leaving them only in chat or terminal scrollback.
4. Before ending, write a session log entry with:
   - goal
   - what changed
   - what was learned
   - exact next starting point
5. If the next step depends on a different tool or specialist, create a
   tool handoff note in `docs/ai/tool-handoffs/`.

## Dangerous Mistakes
- Assuming the next session will remember ephemeral context
- Ending a session with "we were almost there" and no file-based record
- Handing off without stating what to read first
- Omitting blockers or known broken edges

## Detection: When to Hand Off Mid-Session
- The task has expanded beyond the current context window
- Multiple unresolved findings now need consolidation
- The user changes tools or asks for a pause/resume
- The same repo fact is being re-discovered repeatedly

## Escalation Conditions
- If the current-state doc is clearly stale, update it as part of the
  handoff work.
- If no stable next step can be identified, log the ambiguity in
  `docs/audit/agents-open-questions.md`.

## Related Skills / References
- `core/drift-detection.md`
- `core/memory-pressure.md`
- `docs/ai/templates/SESSION_LOG_TEMPLATE.md`
