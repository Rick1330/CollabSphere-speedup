# Session Continuity
## Purpose
Maintain coherent agent state across session interruptions, tool changes, and context resets.
## When to Use
- Starting a new session
- Switching agent tools (Lovable → Claude, Claude → Devin)
- Resuming after >24h gap
- Detecting that current session has degraded (memory burst, contradictions)
## Required Inputs
- Session log directory: `docs/ai/sessions/`
- Current PR/issue handoff comments
- Last 3 commit messages on working branch
- Relevant `AGENTS.md` files
- `docs/architecture/current-state.md`
## Workflow
### Starting fresh session
1. Read `docs/architecture/current-state.md` first
2. Read latest session log in `docs/ai/sessions/`
3. Read PR description + last 3 handoff comments on working issue
4. Read `AGENTS.md` for affected modules
5. Confirm understanding of:
   - Current branch state
   - Last completed milestone
   - Next intended action
   - Any known blockers
6. State the above explicitly before any code changes
### Mid-session checkpoint (every 10-15 turns)
1. Append to session log: what we just did, why
2. Update PR handoff if applicable
3. Commit work-in-progress if scope is bounded
### End-of-session handoff
1. Append final session log entry: what's done, what's pending, where to start next
2. Update PR description with current state
3. Update `docs/architecture/current-state.md` if architectural shift
4. Optional: write a "next session prompt" — what should the next agent be told first?
## Dangerous Mistakes
- Starting code work without reading session log
- Trusting in-session memory over written state
- Continuing past memory burst (model contradicts earlier instructions)
## Detection: When to Hand Off Mid-Session
- Model contradicts an earlier rule it was told
- Model claims to have done something it didn't (file unchanged)
- Model loses track of which file is being discussed
- Conversation length > 30 turns without consolidation
- User correcting same mistake twice
- Token usage warning from agent host
## Escalation
- If session log is missing or stale, STOP and ask user to confirm
- If `current-state.md` disagrees with code, log discrepancy in `docs/audit/`
