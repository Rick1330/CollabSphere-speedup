# Memory Pressure

## Purpose
Recognize and handle agent-session degradation before it turns into
contradictory work or repeated mistakes.

## When to Use
- Any long session
- Any conversation with repeated corrections
- Any task with many partial branches or interruptions

## Signals
- The same repo fact is being rediscovered repeatedly
- The model contradicts an earlier instruction or decision
- The model claims to have finished work that is still open
- The model loses track of which file or branch is under discussion
- The conversation has become long enough that state is obviously
  degrading

## Action
1. Stop implementation churn.
2. Consolidate what is known into:
   - `docs/architecture/current-state.md` if the repo state changed
   - a new session log entry
   - a tool handoff note if another tool will continue
3. Identify the smallest reliable next step.
4. Resume only after the file-based context is strong enough that a new
   session would start cleanly.

## Dangerous Mistakes
- Pushing through obvious context degradation
- Letting unresolved assumptions remain only in chat history
- Continuing after the user has already corrected the same mistake twice

## Escalation Conditions
- Fresh session recommended
- Handoff required between tools
- Repo state has shifted enough that `current-state.md` is now stale

## Related Skills / References
- `core/session-continuity.md`
- `core/drift-detection.md`
