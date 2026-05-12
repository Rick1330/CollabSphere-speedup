# Memory Pressure
## Purpose
Recognize and handle agent-session degradation (memory burst).
## When to Use
- When the conversation exceeds 20-30 turns.
- When the agent starts forgetting previous instructions or rules.
- When the agent confidently makes errors corrected earlier.
## Signals
- Model contradicts an earlier instruction or inviolable rule.
- Model claims to have finished a task but the code remains unchanged.
- Model loses track of which file or module is currently being discussed.
- User finds themselves correcting the same mistake multiple times in one session.
- Token usage warning from the agent host platform.
## Action
1. STOP immediately.
2. Emit an end-of-session handoff document (see `SESSION_LOG_TEMPLATE.md`).
3. Commit all working progress to a stable branch.
4. Request a fresh session from the user.
5. Point the next session at `current-state.md` and the last session log.
## Dangerous Mistakes
- Attempting to "push through" a degraded session, which leads to tech debt and regressions.
- Trusting the model's self-assessment of its own memory.
