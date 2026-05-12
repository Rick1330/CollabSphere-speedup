# Deep Investigation: Agent Rules System, Frontend Quality, and the System You Should Build
This is the consolidated analysis covering agent rules, frontend quality, session memory handling, and the system you should build going forward. Structured in 8 parts — each independently usable.
---
## Part 1 — What you actually have (verified inventory)
### 1.1 Agent rules architecture (the hierarchy)
You have a **three-tier documentation system** plus a fourth layer of executable agent infrastructure. This is more sophisticated than 95% of repos.
```
Layer 1: docs/spec/             ← canonical "What" and "Why" (authoritative)
Layer 2: docs/domains/          ← engineering-oriented "How" (derived from spec)
Layer 3: docs/agent-ref/        ← compact "How right now" (derived from domains)
Layer 4: docs/ai/ + AGENTS.md   ← executable instructions for AI agents
```
The conflict-resolution rule in the root `AGENTS.md:6-10` says: *"If any conflict exists, `docs/spec/` wins."* That's correct industry practice — a single canonical source.
### 1.2 AGENTS.md files (what each says)
| File | Tier | What it enforces |
|---|---|---|
| `AGENTS.md` (root) | Repo-wide | Workspace isolation, REST never returns Yjs, response envelope, canonical error codes, ExecPlan rule, Conventional Commits, dangerous patterns list |
| `apps/api/AGENTS.md` | API local | NestJS layering, RBAC guards, workspace scoping in queries, no IDOR, pagination, domain events |
| `apps/web/AGENTS.md` | Web "Tier A" | Vite SPA preservation, design tokens first, owned primitives, page-state coverage (LELE), TanStack Query, WCAG 2.1 AA, no fetch-in-useEffect, no static-markup tests for interactive components |
| `apps/worker/AGENTS.md` | Worker local | Idempotent jobs, workspace-scoped data, retention rules, no per-keystroke notifications |
| `packages/database/AGENTS.md` | DB local | Schema match agent-ref, additive migrations, soft-delete mandatory, workspace scoping mandatory |
| `packages/shared/AGENTS.md` | Shared local | Centralize enums and error codes, no duplication, alignment with canonical catalogs |
**Missing AGENTS.md files** (verified absent or incomplete):
- `apps/collab/AGENTS.md` — no local rules for Hocuspocus/Yjs work
- `packages/ui/AGENTS.md` — package may not even exist in current shape
- No `tests/AGENTS.md` for testing-specific rules
- No `infra/AGENTS.md` for infrastructure-specific rules
- No `.github/AGENTS.md` for CI/workflow modifications
### 1.3 Skills system at `docs/ai/skills/`
You have three categories:
- **`core/`** — execution control (task kernels, ExecPlans, validation runners, story-validation-runner, project-validation-runner)
- **`guardrail/`** — safety invariants (workspace-isolation, auth-session-security, error-code-discipline)
- **`implementation/`** — common workflows (nestjs-api-endpoint, integration-test-writer, etc.)
Skills follow a structured shape: Purpose → When to Use → Required Inputs → Read First → Workflow → Dangerous Mistakes → Validation Expectations → Escalation Conditions → Related Skills. This is **strong**. It mirrors Anthropic's "skill cards" research and the "constitutional AI" prompting patterns.
### 1.4 Templates at `docs/ai/templates/`
- `TASK_KERNEL_TEMPLATE.md` — file-prescriptive task with metadata, chain, files table, validation, handoff
- `EXECPLAN_TASK_TEMPLATE.md` — for tier:S (complex) tasks that need a separate plan file
- `STORY_VALIDATION_TEMPLATE.md` — story-completion gate with category checklist
- `REVIEW_TASK_TEMPLATE.md` — review-only task structure
- `STORY_TEMPLATE_V2.md` — full story with metadata, AI delivery hints, acceptance criteria, edge cases, planned tasks
The task kernel template's **file-scope rules at line 53-56**:
> *"Prefer exact file paths whenever reasonably inferable. Frontend-only exception: a narrow local wildcard is acceptable... Broad wildcards are not acceptable."*
This is the rule that caused you trouble. Addressed in Part 4.
### 1.5 Review automation system
`docs/agent-ref/ops/review-automation.md` defines three review tiers:
- `review:standard` — agent self-review + one additional review source (human/tool)
- `review:elevated` — two independent passes, security/isolation review explicit
- `review:critical` — independent passes + human approval before merge, no auto-merge from bots
Tools recognized: human, local IDE agent, **CodeRabbit CLI**, Devin Review, CodeScene. The repo policy says run `pnpm review:coderabbit` before push.
### 1.6 PR workflow infrastructure
- Required PR content includes linked issue, validation commands+outcomes, handoff note (`docs/agent-ref/ops/pr-review-workflow.md:43-55`)
- 12 required CI checks (per `CONTRIBUTING.md:365-376`)
- Three repo-owned gate checks (`validate`, `sync`, `route`) emitted by your `.github/workflows/handoff-check.yml`, `pr-status-sync.yml`, `review-router.yml`
### 1.7 Frontend governance documents (`apps/web/docs/`)
- `frontend-architecture.md` — stack, layered seams, boot path, migration state
- `frontend-testing-guide.md` — runner, placement, conventions, coverage patterns
- `frontend-routing-guide.md` — single router rule
- `frontend-directory-structure.md` — feature-based structure with adapter pattern
- `design-system.md` — warm stone palette, semantic tokens
- `routing-recovery.md` — postmortem of mixing Next.js patterns into Vite SPA
- `spec-corrections.md` — behavioral corrections doc
- `mock-data.md` — mock layer documentation
- `changelog.md` — chronological record
- `apps/web/REVIEW.md` — referenced from AGENTS.md (review guidance)
### 1.8 Frontend code quality (current state)
Verified high quality:
- ✅ Vite 5 + React 18 + TS, single-router (RR-DOM v6), TanStack Query for server state
- ✅ shadcn/ui on top of Radix primitives — accessibility built into the primitive layer
- ✅ Tailwind 4 with semantic tokens (warm-stone palette + teal accent)
- ✅ Adapter pattern: UI imports from `src/api/adapters/*`, never directly from `src/lib/mock-*` or `src/features/<f>/mocks/*`
- ✅ Feature-based directory structure (`src/features/<f>/components/pages/hooks/mocks/`)
- ✅ Strong governance doc set — `apps/web/docs/*` is exemplary
- ✅ Tests colocated, behavior-first for interactive components
- ✅ React Hook Form + Zod for forms
Verified gaps:
- ❌ No Storybook / no component documentation site
- ❌ No code splitting / lazy loading visible (all routes load eagerly)
- ❌ No error boundaries (`React.ErrorBoundary` not wired anywhere)
- ❌ No Suspense usage for data loading
- ❌ No i18n
- ❌ No reduced-motion globally enforced
- ❌ No Prettier config
- ❌ ESLint config disables several quality rules: `@typescript-eslint/no-unused-vars: "off"`, `no-explicit-any: "off"` — these are **off** in `apps/web/eslint.config.js:23-25`
- ❌ No `eslint-plugin-jsx-a11y` despite WCAG 2.1 AA requirement
- ❌ No `eslint-plugin-testing-library` / `eslint-plugin-vitest`
- ❌ No bundle analysis / size budgets
- ❌ No visual regression / Chromatic / Percy
- ❌ No design system documentation site
- ❌ No type-level wire-shape contracts shared with backend
---
## Part 2 — What this reflects about agent behavior
### 2.1 The signal you missed
When you said "I'm sure quality is bad in the backend and will be worse for collab/worker" — your intuition is correct:
**The strength of your agent rules is concentrated where you've iterated.** Your `apps/web/AGENTS.md` has Tier A rules with concrete enforcement (page-state coverage, optimistic-update rollback, no fetch-in-useEffect). Your `apps/api/AGENTS.md` has rules but they're *aspirational about NestJS* — the rules say "use NestJS layering" but the code is hand-rolled.
This pattern propagates: agents read rules and enforce what they understand. When rules say "use NestJS" but no NestJS exists, the agent generates *hand-rolled code that pretends to follow Nest conventions*. That's exactly what we saw in the verify-email PR — `auth.controller.ts` is named after a Nest concept but is a factory function.
### 2.2 The agent quality spectrum (research-backed)
Working with multiple agents (Claude, GPT-4, Codex, Devin, Copilot) reveals consistent patterns:
**Weak agent behavior:**
- Treats prompt as literal recipe, never deviates
- Generates code that compiles but doesn't fit existing patterns
- Skips reading referenced docs unless explicit
- Marks tasks complete based on file changes, not behavior
- Leaves dead code, unused imports, console.logs
- Uses any types, suppresses errors
**Mid-tier agent behavior:**
- Reads referenced docs once
- Follows naming conventions of surrounding code
- Tests are pattern-matched from examples
- Will refactor adjacent code if explicitly told to
- Reports "completed" with passing CI as evidence
**Strong agent behavior:**
- Reads referenced docs and propagates implicit invariants
- Notices contradictions between docs and code, flags them
- Tests are designed for the specific behavior, not pattern-matched
- Will refactor adjacent code if it's blocking the right answer
- Distinguishes "tests pass" from "behavior verified"
- Validates with manual smoke when CI can't reach the code path
**Top-tier agent behavior:**
- Reads referenced docs AND infers what's missing from them
- Treats the code as the authoritative spec when docs lag
- Refactors confidently when scope justifies it
- Writes its own tests for invariants it discovers, not just specified behavior
- Pushes back when instructions conflict with codebase reality
- Documents architectural decisions encountered during execution
**Where do agents working on this repo land?** They land at *mid-tier* most of the time, *strong* on `apps/web/`, *weak* on `apps/api/` — directly proportional to how mature the rules and patterns in each surface are. The agent quality you experience is **a function of your rules quality**, not the model quality.
### 2.3 What top-tier solo AI engineers do differently
1. **They write rules as constraints, not recipes.** "Workspace isolation is absolute. Every query MUST include workspace_id." vs "Edit auth.service.ts line 45 to add filter." The first survives refactoring; the second goes stale on day 2.
2. **They write rules as tests where possible.** A constraint that can be enforced by ESLint, TypeScript, or a custom CI script removes the agent's ability to violate it. CodeScene/Sonar/DeepScan are *external rule enforcers* — your agent rules should converge with them, not diverge.
3. **They treat the code as the canonical source after week N of building.** Day-0 plans are reference material. Week-N reality is truth. Strong builders update the plan to match the code, not the other way around.
4. **They build a "context budget" mindset.** Every token the agent spends reading dead docs is a token not spent reasoning about the actual problem. Pruning your docs is as important as growing them.
5. **They use multiple agent tools strategically.** Lovable for UI scaffolding (best at design quality), Claude Code/Cursor for refactoring (best at multi-file context), Codex/Devin for narrow well-specified tasks (best at tight execution loops), Copilot for inline completion. You're already doing this — just normalize it.
6. **They keep a session-state external to chat.** Notion, Obsidian, a dedicated doc, or a `.agent/` directory in the repo. The chat is ephemeral. The state isn't.
7. **They version their rules.** Strong rules evolve. The verify-email PR taught you about pre-push hooks — that lesson should be encoded as a rule in the next session, not lost.
---
## Part 3 — What's actually wrong with your current rules system
### 3.1 The "exact files" rule is a load-bearing mistake
`docs/ai/templates/TASK_KERNEL_TEMPLATE.md:53-56`:
> *"Prefer exact file paths whenever reasonably inferable. ... Broad wildcards (e.g. `apps/web/src/**`) are not acceptable."*
This rule exists for good reasons (scope discipline, audit trail). But for **AI-driven development**, it has unintended consequences:
- It forces tasks to predict file structure that may not exist yet
- It anchors the agent to specific files instead of behaviors
- It penalizes refactoring (the right answer might be a new file, but the task says edit X)
- It makes tasks brittle to any reorganization
- It encourages tasks to be authored from a place of imagined certainty
**Strong teams don't do this for AI-driven work.** They specify behavior + invariants and let the agent (or human) choose the file layout.
The rule should be inverted: **"Specify behavior and invariants. Files are illustrative, not contractual."**
### 3.2 No "session continuity" rule layer
You've been doing handoff manually. There's no rule, template, or skill that systematizes:
- How session state is captured before interruption
- How session state is restored on resumption
- What the agent should read first when handed off mid-task
- How to detect divergence between expected state and actual state
Strong solo-AI builders have a `docs/ai/skills/core/session-handoff.md` skill that prescribes this. You don't.
### 3.3 No "code-as-spec" precedence rule
The conflict resolution at `AGENTS.md:6-10` is: `spec > domains > agent-ref`. But what about **code vs spec when they disagree?**
Verify-email PR: spec said `TOKEN_INVALID = 401`, code intentionally returned 400. The agent had no rule saying "when code-level intent diverges from spec, treat the override as a documented exception." So agents kept tripping over it across rounds.
Strong rule: **"When implementation intentionally overrides spec, the override must be documented inline with rationale, AND in an ADR. Other agents must respect documented overrides as canonical for that endpoint."**
### 3.4 No "drift detection" rule
When `apps/api/AGENTS.md:10` says "use NestJS layering" but no NestJS is installed, the agent has no instruction to flag this. It just writes hand-rolled code that approximates the rule. This compounds across stories.
Strong rule: **"Before implementing, verify that the rule's implementation prerequisites exist in the repo. If they don't (e.g., framework not installed, package not configured), STOP and flag this as a precondition story rather than implementing the workaround."**
### 3.5 No "test runner discipline" rule
Verify-email PR rounds 2 and 3 went red because local tests weren't run. The rules don't say "MUST run `pnpm test:unit` locally before pushing."
Strong rule: **"Pre-push validation required: `pnpm -w lint && pnpm -w typecheck && pnpm test:unit` MUST be green locally. Pushing with red local CI is a process violation."**
### 3.6 No "scope discipline" rule for revision rounds
Verify-email rounds 2-5 each expanded scope unintentionally — antigravity introduced a misplaced design doc, added a `mutationKey`, regressed a test. There's no rule that says "revision rounds modify ONLY the listed files."
Strong rule: **"Round-N revisions are bounded to the N-th cleanup scope. Any new files or refactors outside the round's stated scope require explicit approval before commit."**
### 3.7 The validation categories are too generic
`STORY_VALIDATION_TEMPLATE.md:24-32` lists categories (api-contract, ui-contract, integration, etc.) but no skill cards for *how to actually validate each category*.
Strong rule: each validation category gets a skill card listing the canonical checks. E.g., `docs/ai/skills/validation/edge-cases.md` lists the universal edge cases (empty state, single item, pagination boundary, expired token, soft-deleted entity, race condition, network timeout, rate limit, etc.).
### 3.8 No anti-pattern catalog
You have "Dangerous Patterns (Never)" in `AGENTS.md:43-50`. That's 8 entries — security-focused, useful. But it's missing the **production-quality anti-patterns** that CodeScene/Sonar would flag:
Missing:
- Cyclomatic complexity > 10 in any function
- Code duplication > 3 places without a shared helper
- Nested ternaries
- `any` types in non-test code
- `// @ts-ignore` without explanation
- Tests against private fields without `_debugStats` style API
- Hardcoded IPs outside RFC 5737 ranges in tests
- React component cyclomatic complexity > 15
- Files > 300 lines that aren't pure data
- Functions > 50 lines
Each of these is something the verify-email PR or its predecessors hit. None are rules. All should be.
### 3.9 No handoff-quality rules
Your handoff convention exists but its quality is variable. Look at `TASK_KERNEL_TEMPLATE.md:93-97`:
```
## Handoff
- Summary of changes:
- Validation evidence:
- Open issues / follow-ups:
- Risks or deviations:
```
Four bullets. Strong handoffs include:
- **Architectural decisions made** (not just changes — the *why*)
- **What I would do differently next time** (immediate retro)
- **Where the next session should start** (specific file/line/test)
- **What's known broken or skipped** (so the next session doesn't rediscover)
- **Token-cost for the next agent** (estimate of how much context is needed)
- **Confidence level** (low/medium/high — is this validated or just shipped?)
### 3.10 No "memory pressure" rule
When you said *"memory burst and conflicts"* — that's real. Long agent sessions degrade. They forget instructions from earlier in the conversation. They start contradicting their own rules. They confidently restate things that were corrected an hour ago.
Strong rule: **"If a session exceeds N turns or M tokens of context, the agent MUST emit a handoff document and request a fresh session for the next phase. Do not attempt continuation past the soft limit."**
This isn't about tokens; it's about *state hygiene*.
---
## Part 4 — What top-tier developers and AI-first teams actually do
### 4.1 The "Constitutional AI" approach (Anthropic-pattern)
Top teams structure their agent rules as:
1. **Inviolable principles** (never violate, even if instructed)
2. **Strong defaults** (do this unless explicitly told otherwise)
3. **Conventions** (style, naming — defer if user has different preference)
4. **Suggestions** (best practices to follow when nothing else applies)
Your current `AGENTS.md` mostly mixes these. Workspace isolation is inviolable. Use NestJS layering is a strong default (currently aspirational). Conventional Commits is a convention. There's no clear taxonomy.
**Top-tier teams write a hierarchy doc.** Example:
```markdown
# Rule Hierarchy
## Inviolable (NEVER override)
- Workspace isolation
- No CRDT in REST
- No password/secret logging
## Strong defaults (override only with documented ADR)
- NestJS layering
- Soft-delete on user-facing entities
- TanStack Query for server state
## Conventions (follow unless explicitly differs)
- Commit message style
- File naming
- Test placement
## Best practices (apply when relevant)
- Pre-push local validation
- Test parametric scenarios
```
### 4.2 The "Specs-as-Code" pattern (Stripe, Shopify)
Top teams encode rules as code where possible. Examples:
- ESLint custom rules for "no `any` outside `*.test.ts`"
- Custom CI script: "every workspace-scoped query must include `workspaceId`"
- Husky pre-commit: "fail if `console.log` in non-test code"
- Custom CodeQL rules for the auth/RBAC paths
Your repo has the spec docs. It's missing the **executable enforcement**. Each rule should ideally be enforced by:
1. Documentation (you have this)
2. Linter / type system (mostly missing)
3. CI gate (partially have this)
4. Code review checklist (you have this via PR template)
5. Post-merge audit (missing)
### 4.3 The "Skill Card" pattern (Anthropic, Cohere)
Each skill = one card. Card has:
- Name, purpose, when-to-use, when-NOT-to-use
- Required reading (docs to load before executing)
- Step-by-step workflow
- Anti-patterns (don't do these)
- Validation expectations
- Escalation conditions
- Related skills
Your `docs/ai/skills/` is structured this way. It's strong. The gap: **skills aren't comprehensive enough.** You have ~10-15 skills; you need ~30-50 to cover the domain.
### 4.4 The "Living architecture map"
Top teams maintain a `docs/architecture/current-state.md` that's updated weekly with:
- What's actually deployed
- What's actually wired up
- What's documented as "coming soon" but not built
- What's been removed
- Known divergences between spec and code
This is the **single document an agent should read first.** It tells them where they are, not where you wish they were. Your repo has spec, agent-ref, and AGENTS.md, but no current-state. That's why agents kept generating NestJS-flavored code into a `node:http` codebase.
### 4.5 The "ADR-first" workflow
Top teams: any architectural change requires an ADR (Architecture Decision Record) before implementation. ADRs are short — context, decision, consequences. They live in `docs/spec/07-architecture/07.6-adrs.md` for you (or could be one ADR per file in `docs/adrs/`).
The verify-email PR shipped a `TOKEN_INVALID → 400` override and a `TOKEN_EXPIRED → 410` override **without ADRs**. Future agents have no way to know these are intentional. Strong rule: any non-default behavior is an ADR or it doesn't ship.
### 4.6 The "RFC for agents" pattern
When you're about to start a complex feature, top teams write a 1-page RFC describing:
- What the agent should produce
- What invariants matter
- What's out of scope
- What success looks like
This is essentially what we've been doing in the verify-email rounds — the prompts I've been writing are RFC-shaped. **Make this a formal pattern.** Every story over a certain complexity gets a `docs/rfcs/` document before any code.
### 4.7 Strong AI-first repos use "context bundles"
When sending a task to an agent, instead of saying "read these 8 files," they pre-bundle the relevant content into a single context block. Tools like `repomix`, `codecontext`, or hand-curated context files do this.
Your `docs/agent-ref/` is a step in this direction — it's the compact reference layer. But agents still have to navigate to find the right file. A **per-domain context bundle** (e.g., `bundles/auth-context.md` containing all auth-relevant rules, schemas, error codes, and current state) would reduce read-time per task by 60-80%.
---
## Part 5 — Session memory and continuity
### 5.1 The session-memory problem (verified)
What you experience:
- Agent sessions are interrupted (by you, by token limits, by tool changes)
- Context is lost between sessions
- The next session needs to "catch up"
- Different agents (Lovable, Claude, Devin) don't share state
- Your handoff convention works but is manual
This is the universal solo-AI builder problem. Here's what works.
### 5.2 The four layers of session state
Strong solo builders maintain four layers:
**Layer 1: Repo state (Git)**
- Source of truth for code
- Commit messages encode intent
- ADRs encode decisions
- This layer is durable forever
**Layer 2: Issue/PR state (GitHub)**
- Story body = persistent intent
- PR description + handoff = current execution state
- Comments = decision log
- This layer is durable but searchable
**Layer 3: Session log (markdown)**
- Per-session notes (what we did, what we learned)
- Lives in `docs/ai/sessions/YYYY-MM-DD-topic.md`
- Or in your existing `.agent/execplans/` directory pattern
- This layer is durable and timestamped
**Layer 4: Active context (chat / agent memory)**
- Current conversation
- Ephemeral by design
- Should be rebuilt from Layers 1-3 on every fresh session
You have layers 1, 2, and 4. **You're doing layer 3 informally.** Formalizing it is the highest-value session-memory move.
### 5.3 The session continuity skill (concrete proposal)
Add `docs/ai/skills/core/session-continuity.md`:
```markdown
# Session Continuity
## Purpose
Maintain coherent agent state across session interruptions, tool changes, and context resets.
## When to Use
- Starting a new session
- Switching agent tools (Lovable → Claude, Claude → Devin)
- Resuming after >24h gap
- Detecting that current session has degraded (memory burst, contradictions)
## Required Inputs
- Session log directory: docs/ai/sessions/
- Current PR/issue handoff comments
- Last 3 commit messages on working branch
- Relevant AGENTS.md files
- docs/architecture/current-state.md
## Workflow
### Starting fresh session
1. Read docs/architecture/current-state.md first
2. Read latest session log in docs/ai/sessions/
3. Read PR description + last 3 handoff comments on working issue
4. Read AGENTS.md for affected modules
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
3. Update docs/architecture/current-state.md if architectural shift
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
- If current-state.md disagrees with code, log discrepancy in docs/audit/
```
### 5.4 The session-log format (concrete proposal)
`docs/ai/sessions/2026-04-27-verify-email-cleanup.md`:
```markdown
# Session: Verify Email PR Cleanup
## Date: 2026-04-27
## Agent: Antigravity (rounds 1-5), Claude (review/orchestration)
## PR: #1591
## Status: merged
## What we did
- Round 1: identified 15 gaps in initial impl
- Round 2: typecheck red (Q5 not wired); fix sequenced
- Round 3: unit-tests red (rate limiter test refactor missed)
- Round 4: codescene duplication on test setup
- Round 5: codescene duplication on failure scenarios
- Merged after 5 rounds
## What we learned
- Local verification skipped twice → process fix needed
- File-prescriptive tasks compound debt
- CodeScene fires on patterns ESLint should catch first
- Manual UI smoke gates always get skipped
## Decisions made
- TOKEN_INVALID → 400 (override of catalog default 401)
- TOKEN_EXPIRED → 410 (override of catalog default 400)
- requestNewVerificationHref removed (resend deferred to CS-039)
## Where to start next
- Phase 0 foundations: NestJS migration first
- Issue #50 frozen until foundations land
## Risks / open
- Soft-delete filter on email tokens hypothetical (no integration test)
- Manual UI smoke not run on merge
- Resend CTA text changed to "Back to sign in" (deceptive UX if user expects resend)
## Files where context lives for next session
- docs/spec/07-architecture/07.6-adrs.md (needs ADR-002 entry)
- apps/api/src/auth/auth.service.ts:183-203 (override comments)
- packages/database/prisma/schema.prisma (no changes, but auth tables relevant)
```
This is your **persistent session memory**. Every important session ends with one of these.
### 5.5 Tool-bridging (Lovable → Claude → Devin)
When you switch tools, you lose chat memory but you don't have to lose project memory. The bridge is:
1. End-of-session handoff doc (above)
2. Tool-agnostic prompt for the next tool
Example: when you've been in Lovable building UI and want to switch to Claude/Devin for backend work, you write a `tool-handoff.md`:
```markdown
# Handoff: Lovable → Claude
## What I built in Lovable
- Frontend: Vite + Tailwind + shadcn at apps/web
- All major routes scaffolded with mock data
- Adapter layer in src/api/adapters/
## What Claude needs to know
- Read apps/web/AGENTS.md
- Read apps/web/docs/frontend-architecture.md
- The adapter pattern is canonical: don't bypass it
- Mocks are temporary; will be swapped for real adapters when backend lands
## What Claude should NOT do
- Re-implement components Lovable already built
- Change the adapter pattern
- Modify shell/routing without explicit ask
## Next intended action
- Backend NestJS migration
- Then wire real adapters to replace mocks
```
This is just a markdown file you commit to the repo. The next agent reads it as the first thing.
### 5.6 Conflict detection — when sessions disagree
Two sessions can produce conflicting decisions. Strong defense:
1. **Single canonical state doc** (`docs/architecture/current-state.md`) — when sessions disagree, this is truth
2. **ADRs document overrides** — if a session decided to override a default, ADR captures it; future sessions respect it
3. **Conflict log** at `docs/audit/agents-open-questions.md` (already referenced in your AGENTS.md:24) — when an agent encounters something it can't resolve, it writes here instead of inventing an answer
4. **Drift audit** weekly — read the open-questions log, resolve them in spec/agent-ref, close the loop
You have the file referenced. You probably don't have the discipline. Discipline comes from making it cheap and habitual. Add it to the session-end checklist.
---
## Part 6 — How to make the frontend "world-class"
### 6.1 What's already great
- Single router, single state-management library (TanStack Query)
- Adapter pattern decouples UI from backend reality
- Design tokens + semantic Tailwind classes (no scattered hex codes)
- shadcn/ui on Radix = accessibility built in
- Feature-based directory structure
- Strong AGENTS.md with Tier A enforcement
- Routing recovery postmortem documented
### 6.2 What separates "great" from "world-class"
Linear, Vercel, Stripe, Notion frontends share these characteristics that yours doesn't yet have:
#### Performance budget enforcement
- **Bundle size limits in CI:** every PR fails if `apps/web/dist` exceeds budget. Use `size-limit` or `bundlewatch`. Top teams budget per route (~50KB initial, ~200KB total).
- **Lazy loading routes:** `const Tasks = lazy(() => import('./features/tasks/pages/Tasks'))` — currently you load everything eagerly.
- **LCP/INP/CLS budgets** measured via Lighthouse CI in PR. If LCP regresses by >10%, fail.
#### Component documentation
- **Storybook** is the missing piece. World-class teams document every primitive and every feature component visually. Lovable + Storybook is the workflow. Your repo has the components but nothing showcases them.
- **Visual regression** via Chromatic on Storybook = catches design drift before merge.
#### Animation discipline
- **Centralized motion tokens.** World-class teams have a `tokens/motion.ts` defining `duration.fast`, `duration.medium`, `easing.standard`, etc. — components reference tokens, not raw values. You currently have framer-motion sprinkled with `stiffness: 300, damping: 20` literals.
- **Global reduced-motion:** wrap your entire animation system in a single `<MotionProvider>` that respects `prefers-reduced-motion: reduce` once, not per component. The verify-email PR had to rediscover this for one card.
- **Animation timing rules:** never animate longer than 400ms for entrance, never block interaction during animation. World-class teams encode this as a rule.
#### Accessibility-as-code
- **`eslint-plugin-jsx-a11y`** — adds 30+ accessibility rules to lint. Catches missing alt text, missing labels, invalid ARIA roles. You don't have it.
- **`axe-core` in tests** — every page-level test runs an a11y check. Fail on critical violations.
- **Keyboard-only QA** as a regular check. Top teams have a "keyboard-only Friday" — one designer or engineer navigates the entire app with keyboard once a week and files everything broken.
- **Screen reader testing** monthly. NVDA on Windows, VoiceOver on macOS — at minimum verify the auth flow + critical user paths.
#### Type safety as a feature
- **Branded types** for IDs: `type WorkspaceId = string & { __brand: 'workspace' }`. Prevents passing a `userId` where a `workspaceId` is expected. Your code has `string` for both.
- **Wire types from OpenAPI:** generate frontend types from the backend's OpenAPI spec via `openapi-typescript`. Eliminates the "frontend says field X exists, backend doesn't" class of bugs.
- **Strict `tsconfig`:** `noImplicitAny: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`. Your ESLint config disables `@typescript-eslint/no-explicit-any` — that's the wrong direction.
#### Form discipline
- **Zod schemas as single source of truth:** schema → form validation → API request validation → response validation. One schema, four uses. Top teams use this pattern via `zod-to-openapi` or `tRPC`.
- **Server-side error → form field** mapping. When the backend returns `field-level` errors, the frontend should display them on the right field. Your auth forms probably don't do this yet.
#### Testing maturity
- **Storybook + interaction tests** via `@storybook/test` — replaces a lot of brittle component-level Vitest tests with visual + behavioral.
- **MSW (Mock Service Worker)** for API mocking in tests. Currently you `vi.stubGlobal('fetch', ...)` — MSW is far cleaner.
- **E2E for critical paths** (already in roadmap, Phase 3 of testing report).
#### Error boundaries + observability
- **One root error boundary** that catches uncaught errors and reports to Sentry. World-class teams have feature-level boundaries too.
- **Sentry replay** for the top 5 user paths. Records DOM events on errors so you see exactly what broke.
- **Web Vitals reporting** to your observability stack on every page view.
#### Design system rigor
- **Tokens documented in Storybook** — colors, spacing, typography, radius, shadows visible as a reference page.
- **Density modes** (compact / default / comfortable) — Linear-tier polish.
- **Themed tokens** — light, dark, high-contrast — currently you reference `.dark` but no high-contrast or system-respect theme switcher.
### 6.3 The single highest-leverage frontend improvement
**Add Storybook + Chromatic.** This single move:
- Creates a visual catalog of every component
- Catches visual regressions automatically (Chromatic)
- Enables non-developers to review UI without running code
- Gives you a design system documentation site for free
- Makes it impossible to ship two different versions of "Button"
- Becomes the canonical "design source of truth" that complements your `apps/web/docs/design-system.md`
It's a 1-week investment that pays back forever.
### 6.4 The five lint rules to add today
Even before Storybook, these five rules block future quality drift:
```js
// apps/web/eslint.config.js additions
{
  plugins: {
    "jsx-a11y": jsxA11y,
    "testing-library": testingLibrary,
    "vitest": vitest,
  },
  rules: {
    // Re-enable disabled rules
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "error",
    
    // A11y baseline
    ...jsxA11y.configs.recommended.rules,
    
    // Testing
    ...testingLibrary.configs.react.rules,
    ...vitest.configs.recommended.rules,
    
    // Custom: forbid raw fetch in components
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["**/lib/mock-*", "**/features/*/mocks/*"],
        message: "Import from src/api/adapters/* instead.",
      }],
    }],
  },
}
```
This makes most of the rules in `apps/web/AGENTS.md` machine-enforced rather than human-read.
---
## Part 7 — Concrete proposal for the rule system you should build
### 7.1 New file structure
Add (don't replace) the following to your existing structure:
```
docs/
├── architecture/
│   └── current-state.md                    ← living state doc
├── adrs/                                    ← one ADR per file
│   ├── 0001-modular-monolith.md
│   ├── 0002-nestjs-migration.md
│   └── ...
├── ai/
│   ├── skills/
│   │   ├── core/
│   │   │   ├── session-continuity.md       ← NEW
│   │   │   ├── drift-detection.md          ← NEW
│   │   │   ├── memory-pressure.md          ← NEW
│   │   │   └── ...existing...
│   │   ├── guardrail/
│   │   │   ├── code-quality-gates.md       ← NEW
│   │   │   └── ...existing...
│   │   └── validation/                      ← NEW
│   │       ├── api-contract.md
│   │       ├── ui-contract.md
│   │       ├── edge-cases.md
│   │       ├── permissions.md
│   │       └── performance.md
│   ├── sessions/                            ← NEW
│   │   └── YYYY-MM-DD-topic.md
│   ├── bundles/                             ← NEW
│   │   ├── auth-context.md
│   │   ├── workspaces-context.md
│   │   └── ...
│   └── ...existing templates...
└── audit/
    └── agents-open-questions.md             ← formalize use
```
### 7.2 Updated rule taxonomy in root AGENTS.md
Add to the top of `AGENTS.md`:
```markdown
## Rule Hierarchy
1. **Inviolable** — never override even if instructed
   - Workspace isolation
   - No CRDT in REST
   - No password/secret/PII logging
2. **Strong default** — override only with documented ADR
   - NestJS layering (when migration lands; currently aspirational)
   - Soft-delete on user-facing entities
   - TanStack Query for server state
3. **Conventions** — follow unless explicitly differs
   - Conventional Commits
   - File naming
   - Test placement
4. **Best practices** — apply when relevant
   - Pre-push local validation
   - Test parametric scenarios via it.each
## Code-as-Spec Precedence
- When implementation intentionally overrides spec, the override MUST be documented inline (with comment) AND in docs/adrs/.
- Other agents MUST respect documented overrides as canonical for that surface.
- Undocumented overrides are bugs to be reverted.
## Drift Detection
- Before implementing, verify the rule's prerequisites exist.
- If a rule says "use X" but X is not installed/configured, STOP and flag as a precondition story.
- Do NOT generate code that approximates a missing framework.
## Pre-Push Validation
- Required before any push: pnpm -w lint && pnpm -w typecheck && pnpm test:unit
- ALL must be green locally. Pushing red = process violation.
- Add husky + lint-staged to enforce automatically (P0).
## Session Continuity
- See docs/ai/skills/core/session-continuity.md.
- Every non-trivial session ends with a session log entry.
- Tool switches require an explicit handoff doc.
```
### 7.3 The "current-state.md" document
This is the most important new file. Single page, updated weekly:
```markdown
# Current State
## Last updated: 2026-04-28
## What's deployed
- Staging: api, collab, worker, web (web on Vercel)
- Production: NOT YET PROVISIONED
## What's actually built
### Backend (apps/api)
- Runtime: node:http with hand-rolled factories (NOT NestJS yet — see ADR-002)
- Endpoints: /api/v1/health, /api/v1/auth/register, /api/v1/auth/verify-email
- Test runner: node:test (NOT Vitest yet — see Phase 0)
- Tests: 127 passing
### Frontend (apps/web)
- Vite + React + TypeScript + Tailwind 4 + shadcn/ui
- Single router (RR-DOM v6)
- All feature slices scaffolded with mock adapters
- Backend integration: NOT WIRED (mocks only)
- Tests: ~89 passing (Vitest)
### Worker / Collab
- Worker: hand-rolled (BullMQ not yet wired)
- Collab: hand-rolled bootstrap (Hocuspocus not yet integrated)
### Database
- Prisma schema: complete
- Migrations: 2 applied (initial + enums)
- Seed: NOT WIRED
- Coverage: NOT MEASURED
## Known divergences (spec ↔ code)
- Spec says NestJS, code is node:http
- Spec says Vitest/Jest, code is node:test
- Spec mandates supertest integration, code has socket-only smoke
- Spec mandates 10-15% E2E, code has zero E2E
- TOKEN_INVALID returns 400 on /verify-email (override of catalog 401, see ADR-003)
- TOKEN_EXPIRED returns 410 on /verify-email (override of catalog 400, see ADR-003)
## Open questions / unresolved
- Production deploy approval workflow (DEPLOYMENT.md:122 — "manual or tag-gated by design")
- Backup retention setting (undocumented)
- Connection pooling strategy (defaults only)
## Known broken / paused
- Resend verification email (deferred to CS-039)
- Frontend → real backend integration (waiting on NestJS migration)
## Phase 0 foundation stories (in flight)
1. NestJS migration
2. Vitest backend migration + coverage
3. Test fixtures package
4. Observability bootstrap
5. CI hardening
6. Database safety
## Phase 1 (after Phase 0)
- Production provisioning
- Security scanning
- Real integration tests
- Coverage reporting
## What every agent should read first
- This file
- AGENTS.md (root)
- AGENTS.md for affected module
- docs/ai/sessions/ — most recent entry
- docs/adrs/ — list of titles, read full text only when relevant
```
### 7.4 The "skill cards" you're missing
Add these to `docs/ai/skills/`. Each one is a short card (30-60 lines) in your existing format:
**`core/session-continuity.md`** — already drafted in Part 5.3
**`core/drift-detection.md`**
```
# Drift Detection
## Purpose
Detect when code diverges from documented architecture before building on top of the divergence.
## Workflow
1. Before implementing, read the relevant AGENTS.md
2. Verify prerequisites exist (grep package.json for frameworks, check config files)
3. If rule says "use X" and X is not present, STOP
4. Log discrepancy in docs/audit/agents-open-questions.md
5. Propose precondition story instead of implementing workaround
```
**`core/memory-pressure.md`**
```
# Memory Pressure
## Purpose
Recognize and handle agent-session degradation.
## Signals
- Model contradicts an earlier instruction
- Model claims to have done unfinished work
- Model loses track of which file is discussed
- Conversation > 30 turns without consolidation
- User correcting same mistake twice
## Action
- Stop, emit end-of-session handoff
- Request fresh session
- Point the next session at current-state.md + session log
```
**`guardrail/code-quality-gates.md`**
```
# Code Quality Gates
## Purpose
Anti-patterns CodeScene, Sonar, and DeepScan will flag. Prevent in-session, not post-review.
## Never ship
- Cyclomatic complexity > 9 in any function (CodeScene threshold)
- Code duplication across ≥3 places without shared helper
- `any` in non-test code
- `// @ts-ignore` without comment explaining why
- Hardcoded IPs outside RFC 5737 ranges in tests
- Files > 300 lines that aren't pure data
- Functions > 50 lines
- Tests against private class fields (use _debugStats pattern)
- React component cyclomatic complexity > 15
- Nested ternaries >2 levels
- Dead exports, unused imports, commented-out code
```
**`guardrail/pre-push-validation.md`**
```
# Pre-Push Validation
## Purpose
Prevent the "forgot to run local tests" failure mode.
## Required before every push
pnpm -w lint         # MUST be green
pnpm -w typecheck    # MUST be green
pnpm test:unit       # MUST be green
## Enforcement
- husky pre-push hook runs these automatically
- CI will catch red commits but costs time + tokens
- Pushing red locally = process violation, not CI flakiness
```
**`validation/edge-cases.md`**
```
# Edge Cases Validation
## Universal checklist
- [ ] Empty state (zero items)
- [ ] Single item
- [ ] Pagination boundary (page N, page N+1, page 0, page -1)
- [ ] Expired token / session
- [ ] Soft-deleted entity
- [ ] Race condition (two concurrent requests)
- [ ] Network timeout
- [ ] Rate limit hit
- [ ] Payload size limit
- [ ] Malformed input (null, undefined, "", wrong type, SQL injection, XSS)
- [ ] Permission boundary (member vs non-member, workspace boundary)
- [ ] Soft-delete cascade (what references a deleted entity)
```
**`validation/permissions.md`**
```
# Permissions Validation
## Universal checklist per endpoint
- [ ] Unauthenticated returns 401
- [ ] Wrong-workspace member returns 403 NOT_WORKSPACE_MEMBER
- [ ] Insufficient role returns 403 INSUFFICIENT_PERMISSIONS
- [ ] Soft-deleted user cannot act
- [ ] Archived workspace blocks writes
- [ ] Deactivated user blocked from refresh
- [ ] IDOR attempt (resource ID from other workspace) returns 404 NOT_FOUND (not 403 — non-enumerating)
```
Add these 8 skill cards as a single PR. Total ~500 lines. Massive downstream value.
### 7.5 The session log template
Create `docs/ai/templates/SESSION_LOG_TEMPLATE.md`:
```markdown
# Session: <Topic>
## Date: YYYY-MM-DD
## Duration: ~Nh
## Agent(s): <Lovable | Claude | Devin | Copilot | Antigravity>
## PR(s): #NNN
## Issue(s): #NNN
## Status: <in_progress | handed_off | done>
## Goal
<single sentence: what we set out to do>
## What we did
- <timestamped or sequenced action>
## What we learned
- <insight that should change future work>
## Decisions made
- <any architectural or contract decision — needs ADR entry>
## Blockers hit / risks surfaced
- <things we couldn't resolve — log in docs/audit/agents-open-questions.md>
## Validation evidence
- <tests run, smoke done, screenshots, CI links>
## Where to start next
- <specific file/line/test for the next session>
## Files that hold context for next agent
- <paths the next agent should read first>
## Confidence level
- [ ] low — shipped but unvalidated
- [ ] medium — CI green, manual smoke skipped
- [ ] high — fully validated end-to-end
## Token/context budget estimate for next session
- ~N files to read
- ~N turns expected
```
Use this every session end. Commit to `docs/ai/sessions/`. This is your persistent layer 3 memory.
### 7.6 The context bundles (per-domain)
`docs/ai/bundles/auth-context.md` — aggregated content for any agent working on auth:
```markdown
# Auth Context Bundle
<curated content that combines>
- Relevant parts of AGENTS.md
- apps/api/AGENTS.md auth-specific rules
- docs/agent-ref/api/auth-endpoints.md
- docs/agent-ref/rules/error-codes.md (auth subset)
- docs/spec/05-features/05.1-authentication.md (auth core)
- packages/database schema (auth tables only)
- Current state summary for auth module
- Open questions about auth
```
One file, ~1000 lines, everything an agent needs to work on auth. Build one per major domain (auth, workspaces, documents, tasks, comments, notifications, search). Refresh them after each major story in the domain.
This is your **context compression layer**. An agent that reads a bundle starts ~5x faster than one that has to navigate docs.
### 7.7 The executable enforcement layer
Add (as separate PRs, each ~1 day):
**`.husky/pre-push`**
```sh
#!/usr/bin/env sh
pnpm -w lint && pnpm -w typecheck && pnpm test:unit
```
**`.github/workflows/ci.yml` additions**
- `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`
- `timeout-minutes: 15` on every job
- Composite action for pnpm+Node setup
- Custom step: grep for violation of key invariants (e.g., workspace_id in queries)
**Custom lint rules** in a new package `packages/eslint-config-collabsphere/`:
- `no-cross-workspace-queries` — catches Prisma queries miss`````markdown
**`core/memory-pressure.md`**
```
# Memory Pressure
## Purpose
Recognize and handle agent-session degradation.
## Signals
- Model contradicts an earlier instruction
- Model claims to have done unfinished work
- Model loses track of which file is discussed
- Conversation > 30 turns without consolidation
- User correcting same mistake twice
## Action
- Stop, emit end-of-session handoff
- Request fresh session
- Point the next session at current-state.md + session log
```
**`guardrail/code-quality-gates.md`**
```
# Code Quality Gates
## Purpose
Anti-patterns CodeScene, Sonar, and DeepScan will flag. Prevent in-session, not post-review.
## Never ship
- Cyclomatic complexity > 9 in any function (CodeScene threshold)
- Code duplication across ≥3 places without shared helper
- any in non-test code
- // [@ts-ignore](https://github.com/ts-ignore) without comment explaining why
- Hardcoded IPs outside RFC 5737 ranges in tests
- Files > 300 lines that aren't pure data
- Functions > 50 lines
- Tests against private class fields (use _debugStats pattern)
- React component cyclomatic complexity > 15
- Nested ternaries > 2 levels
- Dead exports, unused imports, commented-out code
```
**`guardrail/pre-push-validation.md`**
```
# Pre-Push Validation
## Purpose
Prevent the "forgot to run local tests" failure mode.
## Required before every push
pnpm -w lint         # MUST be green
pnpm -w typecheck    # MUST be green
pnpm test:unit       # MUST be green
## Enforcement
- husky pre-push hook runs these automatically
- CI will catch red commits but costs time + tokens
- Pushing red locally = process violation, not CI flakiness
```
**`validation/edge-cases.md`**
```
# Edge Cases Validation
## Universal checklist
- [ ] Empty state (zero items)
- [ ] Single item
- [ ] Pagination boundary (page N, page N+1, page 0, page -1)
- [ ] Expired token / session
- [ ] Soft-deleted entity
- [ ] Race condition (two concurrent requests)
- [ ] Network timeout
- [ ] Rate limit hit
- [ ] Payload size limit
- [ ] Malformed input (null, undefined, "", wrong type, SQL injection, XSS)
- [ ] Permission boundary (member vs non-member, workspace boundary)
- [ ] Soft-delete cascade (what references a deleted entity)
```
**`validation/permissions.md`**
```
# Permissions Validation
## Universal checklist per endpoint
- [ ] Unauthenticated returns 401
- [ ] Wrong-workspace member returns 403 NOT_WORKSPACE_MEMBER
- [ ] Insufficient role returns 403 INSUFFICIENT_PERMISSIONS
- [ ] Soft-deleted user cannot act
- [ ] Archived workspace blocks writes
- [ ] Deactivated user blocked from refresh
- [ ] IDOR attempt (resource ID from other workspace) returns 404 NOT_FOUND (not 403 — non-enumerating)
```
Add these 8 skill cards as a single PR. Total ~500 lines. Massive downstream value.
### 7.5 The session log template
Create `docs/ai/templates/SESSION_LOG_TEMPLATE.md`:
```markdown
# Session: <Topic>
## Date: YYYY-MM-DD
## Duration: ~Nh
## Agent(s): <Lovable | Claude | Devin | Copilot | Antigravity>
## PR(s): #NNN
## Issue(s): #NNN
## Status: <in_progress | handed_off | done>
## Goal
<single sentence: what we set out to do>
## What we did
- <timestamped or sequenced action>
## What we learned
- <insight that should change future work>
## Decisions made
- <any architectural or contract decision — needs ADR entry>
## Blockers hit / risks surfaced
- <things we couldn't resolve — log in docs/audit/agents-open-questions.md>
## Validation evidence
- <tests run, smoke done, screenshots, CI links>
## Where to start next
- <specific file/line/test for the next session>
## Files that hold context for next agent
- <paths the next agent should read first>
## Confidence level
- [ ] low — shipped but unvalidated
- [ ] medium — CI green, manual smoke skipped
- [ ] high — fully validated end-to-end
## Token/context budget estimate for next session
- ~N files to read
- ~N turns expected
```
Use this every session end. Commit to `docs/ai/sessions/`. This is your persistent layer 3 memory.
### 7.6 The context bundles (per-domain)
`docs/ai/bundles/auth-context.md` — aggregated content for any agent working on auth:
```markdown
# Auth Context Bundle
<curated content that combines>
- Relevant parts of AGENTS.md
- apps/api/AGENTS.md auth-specific rules
- docs/agent-ref/api/auth-endpoints.md
- docs/agent-ref/rules/error-codes.md (auth subset)
- docs/spec/05-features/05.1-authentication.md (auth core)
- packages/database schema (auth tables only)
- Current state summary for auth module
- Open questions about auth
```
One file, ~1000 lines, everything an agent needs to work on auth. Build one per major domain (auth, workspaces, documents, tasks, comments, notifications, search). Refresh them after each major story in the domain.
This is your **context compression layer**. An agent that reads a bundle starts ~5x faster than one that has to navigate docs.
### 7.7 The executable enforcement layer
Add (as separate PRs, each ~1 day):
**`.husky/pre-push`**
```sh
#!/usr/bin/env sh
pnpm -w lint && pnpm -w typecheck && pnpm test:unit
```
**`.github/workflows/ci.yml` additions**
- `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }`
- `timeout-minutes: 15` on every job
- Composite action for pnpm+Node setup
- Custom step: grep for violation of key invariants (e.g., workspace_id in queries)
**Custom lint rules** in a new package `packages/eslint-config-collabsphere/`:
- `no-cross-workspace-queries` — catches Prisma queries missing `workspaceId`
- `no-rest-crdt-leak` — catches REST handlers returning Yjs state
- `no-direct-mock-import` — catches UI importing from `features/*/mocks/*` directly
- `no-raw-error-throw` — catches `throw new Error` in production code (must be AppError)
These turn soft rules into hard rules. Agents can't violate them even if the prompt is ambiguous.
### 7.8 The ADR process
Move `docs/spec/07-architecture/07.6-adrs.md` to `docs/adrs/*` (one file per decision). Required fields:
- Title: `NNNN-kebab-case-decision.md`
- Context: why did we need to decide
- Decision: what we chose
- Consequences: what becomes true/easier/harder
- Alternatives: what we rejected and why
Rule: any non-default behavior is an ADR or it doesn't ship. Verify-email's 400/410 overrides should have been ADR-003 and ADR-004.
### 7.9 Tool-bridge handoffs
Add `docs/ai/tool-handoffs/` directory with handoffs between agent tools. Example filenames:
- `2026-04-15-lovable-to-claude-frontend-scaffold.md`
- `2026-04-25-claude-to-antigravity-verify-email.md`
- `2026-04-28-antigravity-to-claude-post-merge-cleanup.md`
Each one ~50 lines. Tells the receiving agent what was done, what to respect, what to avoid.
---
## Part 8 — What you should do this week
### Immediate (this session)
1. **Accept Phase 0 scope** — 6 foundational stories before #50, 4-5 weeks
2. **Decide the 31 questions** across NestJS, testing, CI/infra decision matrices
3. **Approve the rule-system additions** (Part 7 above) as a seventh Phase 0 story ("Agent infrastructure hardening") or fold into the individual stories
### Week 1
4. **Write `docs/architecture/current-state.md`** — 1 hour, highest-value doc in the repo after this
5. **Add the 8 new skill cards** — session-continuity, drift-detection, memory-pressure, code-quality-gates, pre-push-validation, edge-cases, permissions, api-contract
6. **Add rule hierarchy to root AGENTS.md** — taxonomy, code-as-spec precedence, drift detection, pre-push validation, session continuity
7. **Add husky pre-push hook** — 30 minutes, prevents future "forgot to run tests" failures
### Week 2 (in parallel with Phase 0 story #1)
8. **Create context bundles** for the first domain being worked on (auth)
9. **Re-enable strict TypeScript rules** in `apps/web/eslint.config.js`
10. **Add jsx-a11y, testing-library, vitest eslint plugins**
11. **Write session-log template** and use it from day one
### Week 3+
12. **Each Phase 0 story gets an ADR** at completion
13. **Each Phase 0 story updates current-state.md** at completion
14. **Each Phase 0 story produces a session log** at completion
15. **Start building out remaining skill cards** — target 30-50 total by end of Phase 0
### Ongoing discipline
- Before any session: read current-state.md + latest session log
- During any session: emit mid-session checkpoint every 10-15 turns
- End of any session: write session log, update current-state.md if needed, log open questions
- Switch tools? Write tool-handoff doc first.
---
## Closing synthesis
### The honest summary of everything we've investigated
You built a genuinely impressive system. The documentation architecture (spec → domains → agent-ref → ai-skills) is stronger than most funded startups. The frontend is clean. The agent rules exist. The validation workflow is sophisticated.
But you shipped it with four structural weaknesses that compound:
1. **Rules are read but not enforced.** Agents respect what they can't violate. You have docs; you need lint rules, CI gates, type checks.
2. **The plan is prescriptive where it should be declarative.** 1200 file-scoped tasks encode day-0 assumptions. Intent survives; file paths don't.
3. **Session memory is implicit.** Your handoff comments work but aren't systematized. Memory burst happens, tool-switches happen, context is lost each time.
4. **Code and spec have silently diverged.** NestJS in docs, `node:http` in code. Vitest in docs, `node:test` in code. Supertest in docs, socket-smoke in code. Each divergence multiplies the cost of every future story because agents try to honor both realities.
These aren't moral failings. They're the natural consequence of comprehensive upfront planning meeting iterative AI-driven execution. Every solo AI builder hits this wall. The ones who break through fix the structural causes, not the symptoms.
### What changes if you do this
If you adopt the Phase 0 scope + the rule system additions in Part 7:
- **Future stories cost less.** Foundations are stable; agents stop fighting framework absence and test-runner mismatch.
- **Session interruptions stop hurting.** current-state.md + session log + context bundles = persistent memory.
- **Tool switches stop hurting.** Tool-handoff docs preserve intent across Lovable → Claude → Devin transitions.
- **Quality gates stop being post-hoc.** Lint rules + husky + CI catch issues before review tools do.
- **Rules become inviolable.** Code-as-spec precedence + drift detection + ADR discipline = no more silent divergence.
- **The 1200 tasks become reference material.** Story bodies survive; task lists become disposable advisory content.
### What this is not
Not a rewrite. Not a restart. Not abandoning your existing structure. Everything you've built stays. The proposals in Part 7 are *additions* to the existing system: ~10 new files, ~5 lint rule additions, 1 husky hook, 1 living state document. Maybe 1 week of focused work to land all of it.
The 1200 tasks stay where they are. They become research notes from past-you. The agent rules you've already written stay. They get sharper, more enforceable, taxonomized. The frontend stays. It gets Storybook + visual regression + better lint coverage. The backend stays for one more week and then gets the NestJS migration that was always supposed to happen.
You're not starting over. You're graduating to a workflow that survives the scale you've built to.
### What I need from you to keep moving
I've now produced four investigations:
1. NestJS migration
2. Testing methodology
3. CI / Docker / DB / Infra
4. Agent rules + frontend + session memory
Each ends with a decision matrix. The accumulated decisions are roughly 40 questions. They cluster into about 8 themes:
1. **Phase 0 scope acceptance** (4-5 weeks before #50) — yes/no
2. **NestJS migration approach** (10 sub-decisions in that report's §6)
3. **Testing approach** (10 sub-decisions in that report's §6)
4. **Infra approach** (8 sub-decisions in that report's §7)
5. **Rule system additions** (the ~10 file additions in Part 7 of this report)
6. **Tool-bridge convention** (Lovable + Claude + Devin handoff docs)
7. **Session log discipline** (per-session entries — yes/no)
8. **ADR discipline going forward** (every override gets one — yes/no)
The simplest path forward: **answer the 8 themes first.** Once those are settled, I write the first Phase 0 prompt (NestJS migration) the same way I wrote the verify-email round prompts — copy-pasteable, scoped, with verification baked in, with the new rule system additions referenced inline.
Then we ship Phase 0 as a sequence of focused stories. Each one ends with a session log + ADR + current-state.md update. Each one builds on the previous one's foundation. Each one is independently mergeable and bisectable.
By the end of Phase 0 (roughly 4-5 weeks if everything lines up), you'll have:
- A NestJS API foundation that matches your spec
- Backend tests on Vitest with coverage measurement
- A test fixtures package eliminating per-file duplication
- Sentry + OpenTelemetry observability covering production blind spots
- Hardened CI with composite actions, concurrency control, timeouts
- Database safety: schema-drift gate, seed script, backup runbook
- The new rule system additions (current-state, session logs, skill cards, husky, lint enforcement)
Then issue #50 lands on this foundation. The verify-email PR's 5-round failure mode becomes a 1-round flow. Future stories don't compound debt — they pay it down through the foundation they land on.
That's what I'd actually do if this were my project.
What's your call on the 8 themes? Once you confirm them — even partially, even just "Phase 0 yes, defer the rule system additions to Phase 1" — I can start writing the first execution prompt.

---
## Part 9 — Realtime Collab Server (Hocuspocus / Yjs) Strategy
### 9.1 Why this is uniquely hard
Realtime collab servers are **stateful, long-lived, and bidirectional**. Unlike REST endpoints (request → response → done), a Hocuspocus server holds:
- Open WebSocket connections per user per document
- In-memory CRDT state (Yjs documents)
- Awareness state (who's typing, where the cursor is)
- Persistence hooks (writes to Postgres, snapshots to S3)
- Auth tokens that expire mid-session
Things that work in REST land break here:
- "Restart the server" disconnects every active editor
- "Run a migration" can corrupt in-memory state
- "Deploy a new version" needs careful handover
- "Test it" requires actual WebSocket clients
- "Mock it" is hard because state is the whole point
This is why your spec separates collab from API: `apps/collab` runs Hocuspocus, `apps/api` runs REST + Socket.IO for app events. They're physically different processes for good reasons.
### 9.2 What strong teams do
Looking at how Linear, Notion, Figma, Liveblocks, and Hocuspocus's own deployment guidance handle this:
#### Architectural separation (you already have this right)
- Collab server is its own process, its own deployment, its own scale-out story
- REST never reads or returns CRDT state (your `AGENTS.md:28` rule)
- Document content's source-of-truth is Yjs binary; everything else is derived
- Your `content_plaintext` column is a derived projection for search; never edited directly (your `AGENTS.md:31` rule)
You got this part architecturally right. The hard part is everything downstream of the architectural choice.
#### Authentication boundary
Strong teams:
- Issue **short-lived collab tokens** at REST level (5-minute JWT, scoped to a single document)
- Hocuspocus validates the token on connect, attaches user context to the connection
- Token expiry triggers reconnect with refresh; users don't see disconnects
- Workspace membership re-validated on token issue, not on every WebSocket frame
You should bake this into `docs/agent-ref/collab/` rules now, before the first real collab story. Your spec at `apps/web/AGENTS.md:30` already says *"Document editor loads content via collab service (Hocuspocus), not REST"* — extend it with the token issuance contract.
#### State transitions that need careful handling
Strong teams encode these as invariants:
- **User loses workspace membership while editing** → server must disconnect them, save current state, reject further updates
- **Document gets archived/locked while users are editing** → server transitions to read-only, prevents new mutations
- **User's auth token expires mid-edit** → graceful refresh without losing in-flight changes
- **Server restart** → drain connections gracefully, snapshot active documents to Postgres, accept reconnects with state restoration
- **Two server instances during deploy** → connections route consistently to the same instance per document (sticky routing or shared state via Redis)
Each of these is a story or set of rules. Hocuspocus has hooks for most of them (`onAuthenticate`, `onConnect`, `onChange`, `onStoreDocument`, `onDisconnect`) — your job is to define the policy for each hook before implementation.
#### Persistence strategy
Strong teams:
- Persist **incrementally** (every N seconds OR every M operations, whichever first)
- Persist **on disconnect** to capture trailing edits
- Persist **snapshots periodically** (e.g., every 10 minutes) to prevent unbounded operation log growth
- Keep **N days of history** (your `DocumentVersion` model already supports this)
- Use **append-only operation log** during the active session, compact on snapshot
You have the schema for this in `packages/database/prisma/schema.prisma`. The `DocumentVersion` model with `yjs_state bytea` is the right shape.
#### Scaling story
This is where many teams get stuck. Hocuspocus is not horizontal-scale-friendly out of the box because each server instance holds independent in-memory state. Solutions:
1. **Sticky routing by document ID** — Container Apps doesn't natively support this; you'd need a load balancer with consistent hashing (or use Hocuspocus's built-in Redis adapter if you adopt it)
2. **Single-instance with vertical scaling** — works until you hit ~10k concurrent connections per instance
3. **Hocuspocus Cloud / Liveblocks / Y-Sweet** — managed alternatives
For your scale (MVP, low traffic), option 2 is fine for v1. Document this as an ADR. You'll know you've outgrown it when one instance can't handle the load.
#### Testing realtime is fundamentally different
Strong teams have:
- **Local Hocuspocus integration tests** that spin up a server, connect a fake Yjs client, perform operations, verify state convergence (your `docs/spec/15-testing/15.3-tools.md:14` mentions this — you don't have it yet)
- **Multi-client convergence tests** — two clients edit simultaneously, verify CRDT merges to same state on both
- **Network partition tests** — disconnect a client, edit, reconnect, verify sync
- **Auth boundary tests** — non-member can't connect; deactivated user gets disconnected
- **Persistence tests** — restart server mid-edit, verify state recovers
These belong in `tests/integration/collab/` once collab lands. Your existing test infrastructure won't cover this — Vitest + supertest doesn't speak WebSocket protocol. You'd add `y-protocols` test client or use Hocuspocus's own test utilities.
### 9.3 What your proposed rule system needs to cover
Add to your `docs/agent-ref/collab/` (currently sparse):
#### `collab-server-rules.md`
- Token contract: REST issues, Hocuspocus validates
- Auth hook implementations and rejection reasons
- Workspace boundary enforcement at every connect
- Read-only state for archived workspaces / locked documents
#### `collab-persistence-rules.md`
- When to write to Postgres
- Snapshot interval policy
- Version retention rules (which align with your existing `DocumentVersion` model)
- How to handle persistence failures (retry, dead-letter, alert)
#### `collab-deployment-rules.md`
- Drain procedure on deploy
- Connection routing policy
- State recovery on restart
- Migration safety (when does a schema change require a maintenance window vs hot-swappable)
#### `collab-testing-rules.md`
- Integration-test scaffold expectations
- Convergence test patterns
- Auth boundary test patterns
Each of these is ~50-80 lines. Total ~300 lines of rules that prevent classes of bugs before they land. The verify-email PR analog: writing the rules first stops the agent from generating "almost right" collab code.
### 9.4 The collab-specific AGENTS.md you're missing
Currently `apps/collab/AGENTS.md` doesn't exist. When collab work starts, this is one of the first files to author. Suggested skeleton:
```markdown
# AGENTS.md (apps/collab)
## Purpose
Local rules for the Hocuspocus collab server.
## Scope
apps/collab — WebSocket server, Yjs document persistence, awareness, auth.
## Inviolable
- Document content source-of-truth is Yjs binary state.
- REST never returns Yjs state (already enforced repo-wide).
- Workspace membership re-validated at every connect.
- Auth tokens are short-lived (≤ 5 minutes) and scoped to single document.
- Soft-deleted users cannot connect.
- Archived workspaces are read-only via collab.
- Locked documents reject mutation attempts (server-enforced).
- Per-keystroke activity events are forbidden (already repo-wide rule).
## Strong defaults
- Hocuspocus extension hooks own the policy (onAuthenticate, onConnect, onChange, onStoreDocument, onDisconnect).
- Use the database extension for Postgres persistence.
- Persist on disconnect; snapshot every 10 minutes.
- Reject malformed Yjs updates; do not accept binary blobs from clients without validation.
## Never do
- Trust client-supplied user IDs; resolve from auth token only.
- Read other workspaces' documents from any hook.
- Hold connections open after auth expiry without re-validation.
- Skip persistence on disconnect (data loss).
## Tests / validation
- Integration tests for: connect with valid token, reject invalid token, multi-client convergence, persistence on disconnect, soft-deleted user rejection, archived workspace read-only.
- No mocking Hocuspocus internals; spin up a real server instance against an ephemeral Postgres.
## References
- docs/agent-ref/collab/collab-server-rules.md
- docs/agent-ref/collab/collab-persistence-rules.md
- docs/agent-ref/collab/collab-deployment-rules.md
- docs/agent-ref/collab/collab-testing-rules.md
- docs/spec/10-realtime/* (canonical spec)
- packages/database/prisma/schema.prisma (Document, DocumentVersion models)
```
### 9.5 The migration / modification strategy specifically
When you eventually need to **modify** the collab server (not just integrate it for the first time):
1. **Read-modify-deploy must be reversible.** Backward-compatible Yjs schema changes only — never break old client compatibility without migration window.
2. **Use feature flags for protocol changes.** New protocol version negotiated at connect; old clients keep working until you force-upgrade.
3. **Test against the live data shape.** Production has Yjs documents from months ago. Your test fixtures should include "ancient" document blobs to verify backward compat.
4. **Have a kill switch.** A feature flag that drops the collab server entirely and reverts the editor to read-only-from-snapshot mode. Used in emergencies when a bad deploy corrupts state.
5. **Snapshot before deploy.** Pre-deploy hook snapshots all active Yjs state to S3. Rollback path is "restore snapshot, redeploy old image."
Document this as a runbook (`docs/operations/collab-deployment-runbook.md`) before the first non-trivial collab change ships.
### 9.6 Suggested sequencing for collab work
Given everything we've discussed, the right order to introduce collab into the project is:
1. **After Phase 0 lands** (NestJS, observability, tests, fixtures, CI hardening, DB safety) — collab work is much harder without these foundations
2. **Before Phase 0 completion (parallel):** write the collab AGENTS.md, the four collab rules files, the testing rules. Pure documentation, no code.
3. **First collab story:** Hocuspocus bootstrap with a minimal pass-through (no persistence, just connect+broadcast). Validate the deployment story (how it boots in Container Apps, how it scales, how it dies gracefully).
4. **Second collab story:** Postgres persistence with `Document.content_yjs` writes. Snapshot strategy. Version creation rules.
5. **Third collab story:** Auth boundary — JWT issuance from REST, validation in Hocuspocus, workspace membership enforcement.
6. **Fourth collab story:** Multi-client convergence tests + production observability.
7. **Fifth collab story:** Wire to frontend via Tiptap + y-prosemirror.
Each story is small, testable, reversible. None of them depend on the next.
### 9.7 The tools / managed-service question
Worth flagging: if collab proves harder than expected to operate, the industry has matured around managed alternatives:
- **Liveblocks** — managed CRDT collab service, handles scaling, presence, persistence
- **Y-Sweet** — open-source Hocuspocus alternative with simpler ops story
- **Hocuspocus Cloud** — official managed Hocuspocus
Your spec chose Hocuspocus self-hosted. That's fine for learning and for keeping data in your Azure environment. But if the "drain connections gracefully on deploy" and "sticky routing" problems start costing you weeks of work, consider managed as a fallback. This is an escape valve, not a default.
Document the decision in an ADR. That way future-you (or a new agent) knows why self-hosted was chosen and under what conditions to revisit.
### 9.8 Summary — how to not mess this up
1. Architecture is already right: separate process, REST/collab boundary, Yjs as source of truth
2. Before any collab code: write `apps/collab/AGENTS.md` + 4 rules files + collab context bundle
3. Sequence collab work into 5 small stories, not one big one
4. Every state transition gets a rule (auth expiry, workspace change, doc lock, server restart)
5. Testing needs real WebSocket clients; existing test infra won't cover it
6. Scaling strategy starts simple (single instance) with a documented threshold for when to revisit
7. Modifications always go through feature flags + snapshot + rollback plan
8. Keep a kill switch for emergencies
Do these eight things and collab becomes a normal engineering problem instead of a scary one.
---
## Part 10 — External Session State (Notion, Obsidian, and the "chat is ephemeral" principle)
### 10.1 What I meant by "state external to chat"
When I said strong solo-AI builders keep state external to chat, I meant: the conversation with the agent is a **working memory**, not a **long-term memory**. The conversation will end, be truncated, or be abandoned. Anything important must live somewhere persistent, searchable, and re-loadable.
The options people use, roughly in order of complexity:
1. **A markdown file in the repo** (`.agent/session-log.md`, `docs/ai/sessions/`) — simplest, versioned with code, searchable via grep
2. **Obsidian** — local markdown vault with graph-based linking, fast search, mobile sync via their paid service
3. **Notion** — cloud-first docs with databases, relations, multiple views
4. **A combination** — repo for code-adjacent state, Obsidian/Notion for research and long-form thinking
You don't need a fancy tool. You need the **discipline** of writing things down before the chat closes. The tool is whatever makes you do that.
### 10.2 Obsidian specifically — what it is and why people use it
**Obsidian** is a free desktop app that reads a folder of markdown files ("vault") and gives you:
- **Wiki-style links** between notes: write `[[note-name]]` and it becomes a clickable link
- **Graph view** — a visual map of how your notes connect to each other (this is the "graph" you've heard about)
- **Full-text search** across every note, instant
- **Tags** and **metadata** (YAML frontmatter) for filtering
- **Daily notes** — a note-per-day template for journaling your work
- **Templates** — reusable structures (e.g., a "session log" template)
- **Backlinks** — every note shows "what other notes link here" automatically
- **Plugins** — a large ecosystem for calendar view, kanban, mind maps, AI integration
The reason solo AI builders gravitate to it: **it thinks the way you think.** Traditional docs (Google Docs, Notion) are hierarchical — docs live inside folders. Obsidian is graph-based — docs link to each other freely, and the structure emerges from the links, not from a folder tree.
For your project specifically, an Obsidian vault could hold:
- Session logs that link to related session logs (`[[2026-04-27-verify-email-cleanup]]`)
- Decisions that link to the ADRs they inspired
- "Known issues" notes that link to the PRs that fixed them
- Research notes on how Linear/Notion/Figma solved a problem you're about to solve
- Your own thinking about where the project is going
The **graph view** lets you see, at a glance, clusters of related thinking — "all notes about auth" form a visible cluster because they all link to each other.
### 10.3 Notion specifically — what it is and why people use it
**Notion** is a cloud-first workspace that gives you:
- **Pages** (rich markdown-plus documents)
- **Databases** — structured tables with multiple views (kanban, calendar, gallery, list)
- **Relations and rollups** between databases (e.g., link a "project" page to multiple "task" rows)
- **Templates** for pages and databases
- **Mentions** of other pages (`@page-name`)
- **Comments** and collaboration (multi-user by design)
- **AI features** (their own AI writes, summarizes, translates)
- **Web clipper** for saving links
- **API** for programmatic access
The reason people use it: **it's cloud-first and multi-user by default.** Better than Obsidian when you're collaborating, worse than Obsidian when you want local-first / offline-first / markdown-native.
For your project specifically, Notion could hold:
- The 18 projects as a database, each with stories as child rows, each story with tasks
- A "decisions" database where you file every architectural choice with context
- A "learnings" database where you log what went wrong and why
- A "research" database for links to articles / videos / examples you want to reference later
- Dashboards that show "what's shipping this week" or "what's blocked"
The downside for a code project: Notion is outside your repo. Search across code+notes is harder. Version history is proprietary. Export is markdown but the graph structure doesn't translate cleanly.
### 10.4 Which one should you use
Honest answer depending on how you work:
**Use the repo (`docs/ai/sessions/`) if:**
- You want session logs versioned alongside code
- You want grep + GitHub search to find things
- You're the only reader
- You don't need offline access across multiple devices
- You're comfortable in markdown
- You want zero additional tools
**Use Obsidian if:**
- You think best when things are linked, not filed
- You want a graph view of your thinking
- You write long-form research / design exploration outside the repo context
- You want local-first, markdown-native, future-proof (your notes are plain files)
- You're willing to invest 1-2 hours learning the tool
- You want something separate from the repo but still yours
**Use Notion if:**
- You collaborate with others (designer, partner, early team member)
- You want structured databases more than free-form links
- You prefer cloud-first, multi-device by default
- You don't mind vendor lock-in
- You want dashboards, kanbans, calendars without building them
**Use a combination:**
- Repo for session logs, ADRs, agent rules, code-adjacent notes (everything that should live with code)
- Obsidian for long-form research, design thinking, architecture exploration, ideas-in-progress
- Notion only if you start collaborating with others
### 10.5 What I actually recommend for you
Based on everything we've discussed:
**Primary: your repo.** `docs/ai/sessions/` + `docs/ai/tool-handoffs/` + `docs/audit/` + `docs/adrs/`. This is where session state lives because:
- Agents can read it directly (they can't read your Notion)
- It versions with the code
- It's searchable via git grep
- It's durable forever (you own it)
- It's what the skill cards in Part 7 reference
**Secondary (optional): Obsidian.** Use it for your own thinking — research, long-form planning, "what if we" exploration, sketching future stories before they become issues. Keep it as a sibling to the repo, not inside the repo. This gives you a space for thinking that doesn't have to be production-quality markdown.
**Avoid: Notion.** For a solo builder with AI agents doing most of the work, Notion is friction. Your agents can't read it. You'd be maintaining two sources of truth. The multi-user features don't apply. If you later hire someone, revisit.
### 10.6 The minimum viable session-state system
If Obsidian feels like too much right now, here's the smallest thing that solves the session-memory problem:
1. **Add `docs/ai/sessions/` to the repo.** One markdown file per session. Template in Part 7.5.
2. **Commit session logs as you go** — not at the end; throughout. If the session gets interrupted, the last commit is the state.
3. **Link session logs to each other** at the bottom of each one: "Previous session: [path], Next session: [path]".
4. **Before any new session, read the most recent session log first.** Before writing code, before reading AGENTS.md, before anything.
5. **When switching tools, write a tool-handoff doc** in `docs/ai/tool-handoffs/`.
That's it. Five rules, no new tools, solves 80% of the session-memory problem.
### 10.7 Where the graph idea becomes useful
If you ever want the graph visualization without adopting Obsidian as your primary tool:
- Obsidian can read your `docs/` folder directly — open it as a vault, use the graph view to visualize how your session logs, ADRs, and skill cards link to each other
- Your repo stays the source of truth
- Obsidian is just a reader
- When you're done browsing the graph, close it. Nothing changes in your repo.
This is the lowest-friction way to get the graph benefit without splitting your state across tools.
### 10.8 The principle behind all of this
Chat is working memory. Working memory is limited and ephemeral. **Every insight, decision, and state transition must leave a trace in persistent memory before the conversation ends, or it's lost.**
The specific tool matters less than the discipline. You've been doing this manually through handoff comments — that works but it's fragile. The proposal is:
- Make the discipline easier (templates, skill cards, directory conventions)
- Make the state machine-readable (agents can load it)
- Make the state searchable (you can find things later)
- Make the state durable (survives tool changes, session resets, time)
Once you have this, you stop feeling the weight of "I'll lose context when the chat ends." The context isn't in the chat. It's in the repo.
### 10.9 Concrete next step for you
This week, if nothing else:
1. Create `docs/ai/sessions/` directory
2. Copy the session log template from Part 7.5 into `docs/ai/templates/SESSION_LOG_TEMPLATE.md`
3. Write today's session log covering this entire investigation (the four reports we've produced)
4. Commit it
5. Next time you start a session, read that log first
That single habit will change how the project feels. The 1200 tasks stop being the weight on your shoulders because you now have a running narrative of where the project actually is, what's decided, and what's next.
The session log is the answer to "where were we?" — which is the most expensive question in solo AI-driven development. Solve that question once and the rest of the workflow falls into place.
---
## Part 11 — Re-Evaluation: Template System and Document Editor (World-Class Standard)
### 11.1 Executive summary
You asked for a brutally honest re-evaluation. Here it is:
**What you have today:**
- A template **schema** that's correctly modeled in Postgres (`Template` table with `kind`, `category`, `scope`, `content` JSONB, versioning fields)
- A template **specification** (`docs/spec/05-features/05.3-templates.md`) that describes basic markdown-based document templates and JSON-based workspace templates
- A template **UI surface** at `apps/web/src/features/templates/pages/Templates.tsx` for browsing
- A document **editor** at `apps/web/src/features/documents/pages/DocumentEditor.tsx` built on Tiptap with Yjs/Hocuspocus for realtime
- Built-in template names listed in spec: PRD, RFC, ADR, RAD, SRS, etc.
**What you don't have today (and need for "world-class"):**
- Templates are markdown strings with section headings — **no real structure, no enforcement, no rich content**
- No tables, no images, no diagrams (mermaid or otherwise), no TOC, no headers/footers, no page numbers, no multi-page support
- No template fields/variables (no `{{project_name}}` substitution at apply-time)
- No template enforcement (a user with a PRD template can immediately delete every section and write whatever they want)
- No template-level metadata blocks (front matter, document properties)
- No block-based editing (you're document-flow / Word-style; modern platforms are block-based / Notion-style)
- No suggestion/comment-on-text/track-changes mode
- No advanced typography (footnotes, citations, callouts, equations)
- No structured RAD/RDD/SRS-grade templates with diagrams + tables + images
**Honest assessment of the gap:** what you have is a "starter outline" template system. What you described wanting (RAD/RDD-grade, multi-page, with diagrams, tables, TOC, headers, footers, page numbers) is **roughly 5-10x more substantial** than what's specified. This is fine — but you need to know it's a major scope expansion, not a polish pass.
### 11.2 What top platforms actually do
Here's how the leaders handle templates and document editing. This is the bar you're asking about.
#### Notion
- **Block-based architecture.** Every paragraph, heading, image, table cell is a discrete "block" with stable ID, draggable, transformable.
- **Template variables.** `{{date}}`, `{{user}}`, `{{workspace}}`, custom dynamic fields.
- **Template buttons** that one-click insert template fragments anywhere.
- **Template galleries** with thousands of community templates plus officially curated ones.
- **Database templates** — every database row can be a templated document with pre-filled properties.
- **Page properties** — metadata at top of every page (status, owner, tags, custom fields) that's queryable.
- **Synced blocks** — same content appears in multiple pages, edits propagate.
- **No real templates as enforcement** — once applied, the document is just blocks; no "this section is required" concept.
- **Export** to PDF, HTML, Markdown.
- **Limitations:** no real page layout (no page numbers, no headers/footers in the Word sense), no print pagination by default.
#### Confluence
- **Page templates** with required fields and section macros.
- **Macros** — embeddable widgets for tables of contents, mermaid diagrams, code blocks with syntax highlighting, info/warning callouts, status labels, decision tables, requirements lists, JIRA issue links, etc.
- **Page hierarchy** with breadcrumbs.
- **Page properties** queryable across the workspace.
- **Templates can include macros** that auto-render TOC, dynamic content, and structured data.
- **Built-in templates** for: meeting notes, project plan, requirements, decision log, retrospective, product launch, brainstorming, etc.
- **Export** to PDF, Word, HTML; print stylesheet supports headers/footers and page numbers.
- **Document-flow editor**, not block-based, but blocks-within-blocks via macros.
#### Coda
- **Tables as first-class** — embed structured data in any document, treat it like a database.
- **Templates with formulas** — pre-populated formulas, references, calculations.
- **Doc-as-app** — buttons, automations, reactivity inside the document.
- **Section concept** with collapsible regions.
#### GitBook
- **Documentation-grade editor** with versioned content, branches.
- **Mermaid built in.** Code blocks with diagrams, math (KaTeX), interactive components.
- **Multi-page documents** with hierarchical navigation, page numbers per section.
- **Export** to PDF with proper pagination, table of contents, page numbers, headers/footers.
- **Templates as full sub-trees** of pages, not single docs.
- **Page properties + frontmatter** for metadata.
#### Slite / Slab / Slate
- **Channel-organized docs** with assigned templates per channel.
- **Template enforcement at folder level** — every doc in this folder uses this template by default.
#### Microsoft Word / Google Docs
- **Page-based layout** with page numbers, headers, footers, sections, columns, page breaks.
- **Styles system** (heading 1, heading 2, body, caption) — change a style and every instance updates.
- **Tracked changes / suggestions / comments** — the gold standard for document review.
- **Field codes** for dynamic content (date, page number, cross-references, TOC, index).
- **Footnotes, endnotes, bibliographies, citations.**
- **Equations** (MathML, LaTeX-like input).
- **Table of contents** auto-generated from headings, updates on save.
- **Cross-references** that update when content moves.
- **Template inheritance** — modify the template, choose to update existing docs.
#### Linear (docs feature)
- **Minimal, opinionated** block editor (Tiptap-based).
- **No templates per se** — issue templates exist but doc templates are very basic.
- **Links to issues, projects, cycles** as native blocks.
- **Mermaid via code blocks.**
#### What this tells us
The "world-class" template + editor is a multi-year effort. Different platforms optimize for different things:
- **Notion** = block-based knowledge management, rich blocks, weak structural enforcement
- **Confluence** = enterprise documentation with macros and TOC, strong structure
- **GitBook** = beautiful exports, versioned docs, technical content (diagrams, math)
- **Word/Google Docs** = print-quality output, traditional document semantics
- **Coda** = document-as-app with embedded computation
You will not become all of these. You will pick a primary identity and excel at it. **Your spec leans toward Confluence + Word hybrid** (academic-friendly, traditional document semantics, professional output). That's the right framing for academic + professional collaboration.
### 11.3 What "RAD/RDD-grade template" actually requires
You specifically mentioned RAD (Requirements Analysis Document) and RDD (Requirements Definition Document) templates with multi-page, sections, images, diagrams, tables, TOC, page numbers, headers, footers. Let me make this concrete.
A real RAD template includes:
1. **Cover page** — title, project, version, date, authors, approver signatures
2. **Document control table** — version history, change log, distribution list
3. **Table of contents** (auto-generated from headings, with page numbers)
4. **List of figures** (auto-generated, with page numbers)
5. **List of tables** (auto-generated)
6. **Section 1: Introduction** — purpose, scope, intended audience, definitions/acronyms, references, document structure
7. **Section 2: Overall Description** — product perspective, product functions, user characteristics, constraints, assumptions, dependencies
8. **Section 3: Specific Requirements**
   - Functional requirements (often presented as tables: ID, name, description, priority, source, status)
   - Use cases (with diagrams — UML use case, activity, sequence)
   - Data model (ERD diagram, table specifications)
   - Interface requirements (UI mockups, API contracts)
9. **Section 4: Non-Functional Requirements** — performance, security, scalability, accessibility, etc., often in tabular form
10. **Section 5: Verification Criteria** — acceptance criteria per requirement
11. **Section 6: Appendices** — glossary, references, supporting materials
12. **Headers** with document title and section
13. **Footers** with page number, version, confidentiality classification
To produce this from a template, the system needs:
- **Multi-section document concept** — sections that can have their own page numbering, headers, footers
- **Auto-generated content** — TOC, list of figures, list of tables, cross-references that update on edit
- **Embedded rich blocks** — tables (with column types, sortable, queryable), images (with captions, numbered as figures), diagrams (mermaid for use cases, sequence, activity, ER), code blocks
- **Document properties** — title, version, authors that flow into headers/footers automatically
- **Variable substitution** — `{{project_name}}` filled at template-apply time
- **Print/export-quality output** — PDF with proper pagination, page breaks, page numbers in headers/footers
- **Section enforcement (optional)** — required sections that can't be deleted, locked headings, completion tracking ("8 of 12 required sections filled")
This is **significantly beyond Tiptap out-of-the-box**. Tiptap gives you the editor canvas. The features above are mostly extension work + server-side export logic + UX layers around the editor.
### 11.4 What's missing from your current Tiptap setup
Based on the codebase audit:
**Confirmed wired (basic editor):**
- Headings H1-H6, paragraphs, lists, blockquotes, code blocks, inline code, links, bold/italic/underline/strikethrough, undo/redo
- EditorToolbar component
- EditorSlashCommand for inline insertion menu
- Submit-for-review integration (academic workflow)
- Yjs collaborative state
**Mentioned as P1/P2 in spec, not yet wired:**
- Tables (P1)
- Images (P2 — depends on file uploads)
- TOC/outline panel (P2)
**Not mentioned anywhere — the gap to world-class:**
- Mermaid diagrams (use case, sequence, activity, ER, flowchart, gantt, state, class)
- Math/equation support (KaTeX or MathML)
- Footnotes, endnotes, citations
- Cross-references that auto-update
- Document properties / frontmatter / page metadata
- Variable substitution in templates (`{{vars}}`)
- Page-based layout (sections, page breaks, columns)
- Headers and footers (per section or document-wide)
- Page numbers (auto-generated, with format choice: `1`, `i`, `1.1`, etc.)
- List of figures, list of tables (auto-generated)
- Suggestion mode / track changes
- Block-based draggable layout (Notion-style)
- Callouts (info, warning, danger, success boxes)
- Embedded files (PDFs, attachments rendered inline)
- Embedded video / external media
- Template enforcement (required sections, lockable headings, completion progress)
- Style inheritance (change H2 style → all H2s update)
- PDF export with pagination, TOC, page numbers, headers/footers
- DOCX export
- Print stylesheet
- Comments-on-text (anchored to specific selection)
- Bibliography / reference manager integration
That's roughly **20 missing features** to reach what you described as world-class. Each is a story or set of stories.
### 11.5 The template enforcement question
You said *"i want to inforce professional world-class template not just some random markdown template."* Let me unpack what enforcement means.
Levels of template enforcement, from weak to strong:
### 11.5 The template enforcement question
You said *"i want to inforce professional world-class template not just some random markdown template."* Let me unpack what enforcement means.
Levels of template enforcement, from weak to strong:
1. **Suggestion only** (current state). Template seeds the document. User can immediately delete everything. No system memory of what the template was.
2. **Soft enforcement.** System remembers the template the doc was created from. Shows a "Reset to template" action. Highlights deviations from template ("3 required sections deleted").
3. **Section-level enforcement.** Specific headings are marked as required. Deleting them shows a warning. Optional: prevent deletion entirely. Track which required sections are filled vs empty.
4. **Field-level enforcement.** Specific fields (project name, author, deadline) are part of the document schema, validated, type-checked. The body of a required section can have minimum-content validation ("introduction must have at least 50 words").
5. **Schema-strict enforcement.** Document is not free-form text — it's a structured form. The "RAD" template is essentially a JSON schema, and the editor renders fields. Deviations are impossible because the editor doesn't allow free-form structure.
6. **Workflow-gated enforcement.** Document can't be submitted for review until all required sections are filled, all variables substituted, all approvals collected.
Top platforms cluster around levels 2-3 with some at level 4. Going to level 5 is what compliance/governance tools do (think pharmaceutical regulatory submissions). It's heavy.
**My recommendation for your scope:** target level 3 (section-level enforcement) for v1.5+, with level 6 (workflow gating) for academic mode. Level 5 is overkill.
What this looks like concretely:
```typescript
// Template defines required structural elements
const RAD_TEMPLATE = {
  id: 'tpl_doc_academic_rad_v1',
  schemaVersion: 2,
  // ... existing fields ...
  
  // NEW: structural contract
  requiredSections: [
    { headingLevel: 1, headingText: 'Introduction', minimumWordCount: 50 },
    { headingLevel: 1, headingText: 'Overall Description' },
    { headingLevel: 1, headingText: 'Specific Requirements' },
    // ...
  ],
  
  // NEW: required document properties
  requiredProperties: [
    { key: 'projectName', label: 'Project Name', type: 'string', maxLength: 120 },
    { key: 'version', label: 'Version', type: 'string', default: '1.0' },
    { key: 'authors', label: 'Authors', type: 'string[]' },
    { key: 'reviewers', label: 'Reviewers', type: 'user[]' },
  ],
  
  // NEW: required artifacts
  requiredArtifacts: [
    { type: 'use-case-diagram', section: 'Specific Requirements' },
    { type: 'requirements-table', section: 'Specific Requirements', minRows: 5 },
    { type: 'erd-diagram', section: 'Specific Requirements' },
  ],
};
```
The editor reads these and:
- Shows a sidebar checklist: "8 of 12 required items complete"
- Surfaces missing items in the document with subtle indicators
- Disables submit-for-review until all required items present
- Optionally locks required headings from deletion
This is enforcement that doesn't fight the user — it guides them.
### 11.6 Re-evaluation of your current spec
Your `docs/spec/05-features/05.3-templates.md` and `08.10-templates.md` are **good for the v1 you specced** but **fundamentally too thin for the v1 you described wanting**.
Specifically, the spec needs to be re-architected to support:
#### A. Multi-tier template format
Current spec: one `content` JSONB field, either `markdown` or `tiptap json`.
What's needed:
```jsonb
{
  "schemaVersion": 2,
  "format": "structured",          -- new format: not just markdown
  "metadata": {
    "title": "Software Requirements Specification",
    "category": "academic",
    "kind": "document",
    "estimatedTime": "2-4 hours to complete",
    "prerequisites": ["project name", "stakeholder list"]
  },
  "properties": [                   -- document properties / frontmatter
    { "key": "projectName", "type": "string", "required": true, "label": "Project Name" },
    { "key": "version", "type": "string", "default": "1.0", "label": "Version" },
    { "key": "authors", "type": "user[]", "label": "Authors" }
  ],
  "structure": {                    -- the document body, structured
    "blocks": [
      {
        "type": "cover-page",
        "config": {
          "showTitle": true,
          "showProperty": ["projectName", "version", "authors"],
          "showLogo": true
        }
      },
      { "type": "page-break" },
      {
        "type": "table-of-contents",
        "config": { "depth": 3, "autoUpdate": true }
      },
      { "type": "page-break" },
      {
        "type": "section",
        "id": "introduction",
        "title": "1. Introduction",
        "required": true,
        "minimumWordCount": 50,
        "blocks": [
          { "type": "subsection", "title": "1.1 Purpose", "required": true },
          { "type": "subsection", "title": "1.2 Scope", "required": true },
          { "type": "subsection", "title": "1.3 Definitions and Acronyms", "blocks": [
            { "type": "definition-table", "columns": ["Term", "Definition"] }
          ]}
        ]
      },
      {
        "type": "section",
        "id": "specific-requirements",
        "title": "3. Specific Requirements",
        "required": true,
        "blocks": [
          {
            "type": "subsection",
            "title": "3.1 Functional Requirements",
            "blocks": [
              { 
                "type": "requirements-table",
                "config": {
                  "columns": [
                    { "key": "id", "type": "string", "label": "ID" },
                    { "key": "name", "type": "string", "label": "Requirement" },
                    { "key": "priority", "type": "enum", "options": ["High", "Medium", "Low"] },
                    { "key": "status", "type": "enum", "options": ["Draft", "Approved", "Implemented"] }
                  ],
                  "minRows": 5
                }
              }
            ]
          },
          {
            "type": "subsection",
            "title": "3.2 Use Cases",
            "blocks": [
              { "type": "mermaid-diagram", "config": { "kind": "use-case", "required": true } }
            ]
          }
        ]
      }
    ]
  },
  "footer": {
    "showPageNumbers": true,
    "showProperty": ["projectName", "version"],
    "showConfidentiality": "Internal"
  },
  "header": {
    "showProperty": ["sectionTitle"]
  },
  "exportDefaults": {
    "format": "pdf",
    "pageSize": "A4",
    "margins": "narrow",
    "includeListOfFigures": true,
    "includeListOfTables": true
  }
}
```
That's a real RAD/SRS template definition. Substantially more than markdown headings.
#### B. Custom block types
The spec currently relies on Tiptap's default extensions. World-class needs custom blocks:
- `cover-page` — renders as styled cover with metadata
- `table-of-contents` — auto-generated from headings, updates on save
- `requirements-table` — typed table with column validation
- `mermaid-diagram` — embedded mermaid with required `kind`
- `definition-table` — terms/acronyms table
- `callout` — info/warning/danger/success styled boxes
- `figure` — image with caption and figure number
- `equation` — KaTeX-rendered math
- `cross-reference` — `[See section 3.2]` that updates if section moves
- `footnote` — numbered footnote with auto-generated reference list
- `code-block` — with language, line numbers, syntax highlighting (better than Tiptap default)
- `page-break` — explicit page break for export
- `section` / `subsection` — semantic, named, optionally required
Each is a Tiptap node extension + a React renderer. Each is ~200-500 lines of code. There are ~12 of them. Total custom-block work: ~3-5k lines.
#### C. Server-side rendering for export
Spec mentions Playwright/Chromium for PDF rendering. That's the right call. But the implementation needs:
- A dedicated render service (apps/exporter or extend apps/worker)
- A print stylesheet (CSS) that handles page breaks, page numbers via `@page`, headers/footers via running elements
- A way to render the editor's blocks to print-quality HTML
- Asset handling (images, embedded fonts)
- Multi-page pagination logic
- DOCX export (separate path: probably via pandoc or custom mapping from Tiptap JSON to DOCX)
This is a substantial subsystem on its own.
### 11.7 The current state — re-stated honestly
Your repo today has:
- ✅ Template **schema** in DB
- ✅ Template **spec** for v1 markdown templates
- ✅ A **catalog UI** to browse templates
- ✅ A **basic Tiptap editor** with headings/lists/links/code
- ✅ **Yjs realtime** scaffolded
- ✅ **Academic submit/review** UI elements
- ⚠️ Template **content** is empty markdown shells, not real templates
- ⚠️ Editor is a **basic text editor**, not a document/page-aware composition surface
- ❌ No tables, images, diagrams, math, footnotes, callouts
- ❌ No TOC, page numbers, headers, footers, sections-as-first-class
- ❌ No template properties, variables, enforcement
- ❌ No PDF/DOCX export pipeline
- ❌ No cross-references, list of figures, list of tables
- ❌ No template gallery beyond hand-coded list
- ❌ No template versioning UX
- ❌ No suggestion / track-changes mode
- ❌ No comment-on-selection (only doc-level comments)
This is the **realistic gap.** The frontend looks polished because Lovable made the chrome look good. The depth isn't there yet.
### 11.8 What you should actually do — phased plan
I'm going to be opinionated here. Trying to build all of this in one push will repeat the verify-email PR pattern at 100x scale. You need to phase it carefully.
#### Phase A: Spec re-architecture (1 week, no code)
Before writing any code, rewrite the template + editor specs to reflect the world-class target.
1. Rewrite `docs/spec/05-features/05.3-templates.md` to describe the structured-block format from §11.6
2. Add `docs/spec/05-features/05.4a-document-blocks.md` — full inventory of required custom blocks
3. Add `docs/spec/05-features/05.4b-document-properties.md` — frontmatter / metadata model
4. Add `docs/spec/05-features/05.4c-document-export.md` — PDF/DOCX pipeline architecture
5. Add `docs/spec/05-features/05.4d-template-enforcement.md` — enforcement levels, required sections, completion tracking
6. Update `docs/agent-ref/collab/tiptap-capabilities.md` with the expanded extension list
7. Update `packages/database/prisma/schema.prisma` design — Template needs a richer content model and Documents need a properties JSONB column
Output: 5 spec docs + 1 schema design ADR. Zero implementation.
#### Phase B: Foundation extensions (3-4 weeks)
Build the editor extensions in order of dependency:
1. **Document properties** — frontmatter UI + persisted to `documents.properties` JSONB column. (Foundation for headers/footers and template variables.)
2. **Custom block infrastructure** — establish the pattern for adding Tiptap node extensions with React renderers, persistence to Yjs, and structured serialization.
3. **Section block** — semantic section node with title, id, required flag. (Foundation for TOC, cross-refs, enforcement.)
4. **Table block** (rich) — typed columns, sortable, queryable. Tiptap's table extension is a starting point; we'll need a richer wrapper.
5. **Image block** — with file upload to S3, captions, figure numbering. Requires the file-upload story to land first.
6. **Callout block** — info / warning / danger / success styled boxes.
Output: 6 custom blocks operational, persisting in Yjs, rendering correctly in the editor.
#### Phase C: Document chrome (2-3 weeks)
Things that wrap around the editor canvas:
7. **Cover page block** — pulls from document properties.
8. **Table of contents block** — auto-generated from heading structure, updates live.
9. **Page-break block** — explicit page break, visualized in editor.
10. **Header/footer config** — per-document settings panel for what shows in headers/footers (mostly relevant on export, but visible in print preview).
11. **Cross-reference block** — `[See §3.2]` that updates if section moves.
12. **Footnote block** — numbered, auto-generated reference list at section end.
Output: documents look like real documents in the editor, not just text in a panel.
#### Phase D: Diagrams and math (1-2 weeks)
13. **Mermaid block** — embedded mermaid renderer with kind selector (use-case, sequence, activity, ER, flowchart, gantt, state, class). Edit raw mermaid syntax in a side panel; live preview.
14. **Equation block** — KaTeX-rendered math, inline and block.
Output: documents can include diagrams and equations as first-class content.
#### Phase E: Template enforcement (2 weeks)
15. **Required-section tracking** — sidebar checklist of required structural elements, with completion %.
16. **Reset to template** action — diff current document against template; allow restoring deleted required sections.
17. **Submission gating** — prevent submit-for-review until required items complete (academic mode).
18. **Template variable substitution** — `{{projectName}}` resolved at apply-time from properties.
Output: templates actually enforce structure, not just suggest it.
#### Phase F: Export pipeline (3-4 weeks)
19. **Print stylesheet** — CSS that handles `@page`, page breaks, headers/footers via running elements.
20. **PDF export job** — Playwright/Chromium server-side rendering, async via BullMQ, with download via signed S3 URL.
21. **DOCX export** — convert Tiptap JSON to DOCX via custom mapping or pandoc.
22. **List of figures, list of tables** — auto-generated, included in PDF export.
23. **Page numbers** — auto-numbered in PDF export, format choice (`1`, `i`, `1.1`).
Output: world-class PDF/DOCX export from any document.
#### Phase G: Real templates (2-3 weeks)
24. **RAD template** (full) — cover page + TOC + 8 sections + diagrams + tables + properties.
25. **RDD template** (full) — similar structure, requirements-definition focus.
26. **SRS template** (full) — IEEE 830-style with all sections, requirements tables, ERD diagram.
27. **PRD template** (full) — product-focused with goals, metrics tables, mockup placeholders.
28. **RFC template** (full) — proposal/decision with alternatives table.
29. **ADR template** (full) — context/decision/consequences with proper structure.
30. **Project Proposal** (academic, full).
31. **Senior Project / Thesis Outline** (academic, full).
32. **Meeting Notes** (full) — agenda, attendees, decisions table, action items table.
33. **Sprint Retrospective** — went-well, went-poorly, action-items tables.
Output: 10+ professional-grade, fully-featured templates ready to use.
#### Phase H: Polish and advanced (ongoing)
- Suggestion mode / track changes
- Comments-on-selection (vs document-level only)
- Block-style enhancements (drag-and-drop reordering, block menus)
- Style inheritance (heading styles globally configurable)
- Workspace-level template authoring (let admins create custom templates)
- Bibliography / citations
- Template marketplace (public scope)
### 11.9 Total realistic effort estimate
If we add up the phases:
| Phase | Description | Weeks |
|---|---|---|
| A | Spec re-architecture | 1 |
| B | Foundation extensions | 3-4 |
| C | Document chrome | 2-3 |
| D | Diagrams + math | 1-2 |
| E | Template enforcement | 2 |
| F | Export pipeline | 3-4 |
| G | Real templates (10+) | 2-3 |
| H | Polish (ongoing) | — |
| | **Total to "world-class v1"** | **14-19 weeks** |
That's 3-5 months of focused work, in addition to the Phase 0 foundations we already discussed (NestJS, observability, testing infrastructure).
This is the real cost of "world-class document templates with full editor capabilities." It's a major workstream that's effectively its own product. Most teams underestimate it by 3-5x — I'm trying to give you the honest number.
### 11.10 The recommendation
Given everything, here's what I'd actually do:
**Option 1: Honest scope cut.** Accept that "world-class document templates" is a 3-5 month project and sequence it accordingly. Get Phase 0 (NestJS + foundations) done first. Then commit to template work as a dedicated multi-month story arc. Don't try to deliver other features in parallel during this period.
**Option 2: Tier reduction.** Drop "world-class" to "professional." Skip Phases D, F partial, H. Build:
- Phase A (spec)
- Phase B partial (sections, basic tables, images)
- Phase C partial (cover page, TOC)
- Phase E partial (required sections tracking, no enforcement gating)
- Phase F partial (basic PDF export, no DOCX, no list-of-figures)
- Phase G partial (5 templates, not 10+)
This gets you to "good enough" in 6-8 weeks instead of 14-19.
**Option 3: Buy don't build.** Use a managed editor with templates built in. Tiptap Pro, Slate.js + commercial extensions, Plate.js, BlockNote, or even embed something like SaaS-side (Notion API, GitBook). Drop the custom editor. Massively faster but less differentiation, more vendor risk, less academic-workflow control.
**My honest recommendation: Option 2.** Get to professional-grade in 6-8 weeks. Ship it. Use real customer feedback to decide which Phase D/F/H items are worth the additional investment. Don't speculate on world-class without users telling you what world-class means for them.
Going for Option 1 (full world-class up front) is what burned the verify-email PR pattern. Big upfront commitments without iterative learning produce technically correct but emotionally exhausting work.
### 11.11 What changes about your spec docs and rules
If you accept Option 2, your spec rewrite is:
- Update `docs/spec/05-features/05.3-templates.md` to describe the **structured block** format and required-section concept
- Add `docs/spec/05-features/05.4a-document-blocks.md` listing the **6 foundation blocks** (Phase B), with future-blocks listed as v1.5+
- Add `docs/spec/05-features/05.4b-document-properties.md`
- Add `docs/spec/05-features/05.4c-document-export.md` with PDF-only for v1, DOCX as v1.5
- Update `docs/agent-ref/collab/tiptap-capabilities.md` to include the foundation blocks as P0
- Add `docs/agent-ref/data/document-properties-schema.md`
- Add a new `apps/web/AGENTS.md` rule under Tier A: "Document blocks must implement persistence via Yjs node attributes; never via React state. Editor extensions must work in collaborative mode."
### 11.12 What changes about your data model
`Document` model needs:
```prisma
model Document {
  // ... existing fields ...
  
  // NEW
  properties        Json?    [@map](https://github.com/map)("properties") [@db](https://github.com/db).JsonB
  // ^ frontmatter / document properties (projectName, version, authors, etc.)
  
  // NEW
  templateId        String?  [@map](https://github.com/map)("template_id") [@db](https://github.com/db).VarChar(120)
  // ^ remember which template the doc was created from (for "reset to template")
  
  // NEW  
  templateVersion   Int?     [@map](https://github.com/map)("template_version")
  // ^ version of the template at apply-time (for migration when template updates)
  
  // NEW
  exportSettings    Json?    [@map](https://github.com/map)("export_settings") [@db](https://github.com/db).JsonB
  // ^ per-document export overrides (page size, margins, header/footer config)
}
```
`Template` model needs schemaVersion bumped to 2 with the new structured format. Existing templates need a migration to convert markdown content into the structured block format. v1 markdown templates can stay supported (read-only legacy) until v2 versions land.
### 11.13 The toolbar question specifically
You mentioned wanting much more in the editor toolbar. Let me make this concrete.
**Current toolbar capabilities (per `apps/web` audit):**
- Bold / italic / underline / strikethrough
- Headings H1-H6 dropdown
- Bullet / ordered list
- Blockquote
- Inline code / code block
- Link
- Undo / redo
**World-class editor toolbar would add:**
Per-section formatting:
- Strikethrough (already there) + Highlight color
- Subscript / Superscript
- Text color / background color
- Font family / font size (controversial — most modern editors don't expose these; let them be design-system-defined)
- Clear formatting
Block insertion (slash menu + toolbar):
- Image upload
- Table insert (with rows/columns picker)
- Mermaid diagram insert
- Math equation insert
- Callout (info / warning / danger / success)
- Quote (already there)
- Code block (already there)
- Divider / horizontal rule
- Page break
- Cross-reference picker
- Footnote
Document operations:
- Insert TOC
- Insert cover page
- Document properties (open frontmatter editor)
- Export (PDF, DOCX, Markdown)
- Print preview
- Find and replace
- Word count / reading time / completion %
Collaboration:
- Comment on selection (anchored)
- Suggest edit (track-changes mode)
- Mention user
- Mention page (cross-link to other docs)
View modes:
- Edit / suggesting / viewing
- Outline panel toggle
- Comments panel toggle
- Show/hide invisibles (page breaks, etc.)
- Zoom / page width
That's roughly 30 toolbar items. Best practice is to organize them into:
- A primary toolbar (always visible) — bold/italic/heading/list/link
- A secondary "more" menu — color, subscript, clear formatting
- A floating block toolbar (appears on selection of a block) — block-specific actions
- A slash command menu (`/`) — for inserting new blocks
- A document menu (top right) — properties, export, print, settings
Notion-style editors do this well. Word/Google Docs use ribbon-style which is heavier but discoverable.
For your editor, I'd recommend the Notion-style hybrid:
- Minimal floating toolbar that appears on text selection (formatting marks)
- Persistent slash menu for block insertion
- Document chrome (right panel) for properties, export, history, comments
- A small top toolbar for save status + collaboration presence
Currently you have something close to this — `EditorToolbar` + `EditorSlashCommand` + `EditorContentArea` + `EditorStatusBar`. The architecture is right; the contents are basic.
### 11.14 What top platforms invest in that's hidden
Things you can't see by browsing the platform but cost massive engineering effort:
**Notion's secret weapons:**
- **Block reconciliation engine** — when two users edit the same paragraph in two browsers, the system merges changes correctly. Notion built their own CRDT-like system years before standardizing.
- **Universal block model** — every database row, every page, every block in a doc shares the same model. You can convert any block to any other block (paragraph → heading → toggle → callout) lossy-but-predictably. This is harder than it looks.
- **Linked databases** — query a database from inside another doc, see filtered/sorted view. Requires graph-DB-like queries underneath.
- **Sub-page hierarchy** — every doc can have child pages, breadcrumbs, parent links.
**Confluence's secret weapons:**
- **Macro architecture** — extensible plugin system where macros can be authored by admins or third parties. The TOC, page properties, info-box, JIRA-issue macros are all macros.
- **Page properties + space rollups** — pages have typed metadata that can be queried across the whole space.
- **Print stylesheet** — multi-decade investment in producing print-quality PDFs.
**GitBook's secret weapons:**
- **Versioning of entire books** — git-backed, branchable, with merge support.
- **Mermaid + math + diagrams as native primitives** — not bolt-on extensions, but core to the editor model.
- **Beautiful exports** — investment in typography, page layout, table-of-contents generation that rivals InDesign output for technical docs.
**Microsoft Word's secret weapons (60+ years of work):**
- **Field codes** — dynamic content (page numbers, dates, cross-references, table of contents, indices, citations) that recalculates on save. This system alone is more complex than most apps.
- **Style inheritance** — change a style at the doc level, every instance updates. No web editor matches Word here.
- **Track changes** — multi-author edit tracking with merge/accept/reject. Notoriously hard to get right with CRDTs.
- **Section breaks with independent layouts** — each section can have its own page size, orientation, margins, headers, footers, page numbering.
You will not match these in v1. Some of these you should never match (style inheritance is genuinely hard and Notion intentionally rejected it as too complex). Pick the 3-5 secret weapons that matter for your audience (academic + professional collaboration) and invest deeply.
For your audience I'd suggest the priority weapons are:
1. **TOC + cross-references that update reliably** (academic rigor)
2. **Mermaid + tables as first-class** (technical depth)
3. **PDF export with proper pagination** (academic submission, professional handoff)
4. **Required-section enforcement** (template integrity)
5. **Comments-on-selection + suggest mode** (review workflow, especially academic)
Skip: style inheritance, field codes (too heavy), block databases (too Notion-specific).
### 11.15 The migration path question
You already have Tiptap wired up. Migrating to a more capable editor without losing existing work:
**Stay on Tiptap.** It's the right foundation. Tiptap Pro has commercial extensions (advanced tables, file-attachment), and the underlying ProseMirror is the most extensible rich-text framework in JS. The path to world-class is *adding extensions* to your existing setup, not replacing the editor.
**Use Tiptap's Yjs collaboration extension.** You already do (Hocuspocus). Custom blocks must be implemented as collaborative-aware nodes (their state lives in Yjs). This is a learning curve but the official docs cover it.
**Adopt the structured-block model gradually.** Each new custom block is a Tiptap node extension + a React renderer. They coexist with the existing markdown-converted content. Old documents stay readable; new templates leverage new blocks.
**Don't build a new editor from scratch.** Lexical, Slate, ProseMirror-direct are alternatives, but the migration cost would be enormous and you'd lose the Yjs integration that's already working.
### 11.16 What this means for the project plan
Concretely, here's how the template/editor work fits into the broader roadmap we've been discussing:
**Phase 0 (already discussed): Foundations**
- NestJS migration
- Vitest backend migration
- Test fixtures
- Observability
- CI hardening
- DB safety
- Rule system additions
**Phase 1 (already discussed): Production readiness**
- Prod environment provisioning
- Security scanning
- Real integration tests
- Coverage reporting
**Phase 1.5 (NEW — what we just discussed): File uploads + S3 storage**
- Required before image blocks in editor
- Required before file-attachment blocks
- Required before PDF export (for storing exported PDFs)
**Phase 2: Editor depth (this discussion)**
- A. Spec re-architecture (1 week, no code)
- B. Foundation blocks (3-4 weeks)
- C. Document chrome (2-3 weeks)
- E. Template enforcement (2 weeks)
**Phase 2.5: Real templates**
- G. Build 5-10 professional-grade templates (2-3 weeks)
- Workspace template enrichment (1 week)
**Phase 3: Diagrams + export**
- D. Mermaid + math (1-2 weeks)
- F. PDF export pipeline (3-4 weeks)
- DOCX export (additional 2 weeks if pursued)
**Phase 4: Collaboration depth (parallel with rest of project)**
- Comments-on-selection
- Suggest mode / track changes (this is genuinely hard with CRDTs)
- Mention picker
- Real-time presence beyond cursor (active section indicator)
**Phase 5: Polish (ongoing)**
- Style improvements
- Workspace-level template authoring
- Template marketplace
- AI-assisted template suggestions
If we add the editor work to the timeline, you're looking at roughly **6 months of focused engineering** to get from where you are today to world-class document collaboration with templates. That's not a critique — that's just the honest cost of the level of polish you described wanting.
### 11.17 Smaller unlocks worth considering
If 6 months feels too long, here are smaller wins that punch above their weight:
**Single-week wins:**
- Add real **content** to the existing markdown templates (replace the "# Section\n\n## 1. Intro\n\n" with actually-useful starter text for each template).
- Add **template preview** that shows formatted output, not just headings.
- Add **template categories filter** that's actually meaningful (right now it's just three buckets).
- Add **"create from template"** button at every doc-creation entry point.
**Single-month wins:**
- Add **mermaid via code blocks** — a code block with `mermaid` language renders as diagram. Cheap to implement (one Tiptap extension + mermaid.js library). Massive perceived value.
- Add **basic tables** via Tiptap's table extension. Not the rich typed tables, but functional editable tables.
- Add **document properties** (frontmatter) UI — even if it doesn't enforce, gives the document a real identity.
- Add **markdown export** — relatively simple compared to PDF. Cheap win.
- Add **"reset to template"** action — uses existing template content, replaces the document's body. Low complexity, addresses a real use case.
These won't get you to world-class, but they shift the perceived quality from "starter" to "serious" in 4-6 weeks of work.
### 11.18 The hardest honest take
You said you want world-class. Building world-class document software is not a side feature — it's a primary product surface that companies have built billion-dollar businesses on top of (Notion, Confluence, Coda, GitBook). When you say you want a system that rivals these, you're saying you're willing to invest one of your major engineering arcs in this surface.
That's a legitimate choice. CollabSphere is positioned as a collaboration platform — making documents the strongest surface is consistent with that positioning. Your audience (academic + professional) cares deeply about document quality.
But it's a big commitment. If you make it, here's how you protect yourself:
1. **Time-box phases.** Each phase has a 2-week budget. If a phase blows past its budget, stop and re-evaluate before continuing.
2. **Ship behind feature flags.** New blocks behind `experimental.advanced-blocks` flag. Real users see them only when stable. Internal testing has them on always.
3. **Use real users early.** Phase 2.5 (real templates) should land in front of beta users to confirm the templates are actually useful. Without that feedback, you're building blind.
4. **Document every decision** as ADRs. The choices around block format, enforcement levels, export pipeline — all of these will be re-litigated by future you (or future agents) if not captured.
5. **Measure quality continuously.** "World-class" is a feeling. Pin it to metrics: TTI for documents (time-to-interactive), edit latency, render fidelity vs PDF, user-reported polish score.
If at any point this work isn't producing a clear quality lift, course-correct. Don't romanticize sunk cost.
### 11.19 The decision you need to make
Three forks in the road:
**Fork A: Full world-class.** Commit to 14-19 weeks of editor + template work after Phase 0 + 1 land. This is the path you described wanting. It's expensive but defensible.
**Fork B: Professional grade (Option 2 from §11.10).** 6-8 weeks of focused work. Skip diagrams, math, advanced export, advanced collaboration. Get to a "good enough" level that ships, then iterate based on user feedback.
**Fork C: Defer.** Keep the current basic editor. Focus on other features (auth, workspace, tasks, comments) for v1. Revisit the document/template depth in v2 once user feedback says it's the bottleneck.
I'd argue Fork B is right for where you are. You've spent 4 months on the platform. You don't have users yet. You don't know which templates matter most. You don't know if the academic workflow is the main use case or if professional teams dominate. Spending 4-5 more months on document depth before having a single user gives you the wrong answer with high confidence.
Build to professional-grade (Fork B). Ship to early users. Let their behavior tell you whether to invest in world-class (Fork A) or pivot.
### 11.20 What I need from you to keep moving
Before we plan template/editor work specifically:
1. **Pick a fork: A, B, or C.** Tell me which one.
2. **Confirm priority order against everything else.** Does the editor work happen before or after the issue #50 work? Before or after Phase 0 foundations?
3. **Decide on the spec rewrite.** Is the structured-block format from §11.6 the direction we go? Or do you want a different structural model?
4. **Decide on enforcement level.** Soft (level 2), section-level (level 3), or workflow-gated (level 6)?
5. **Decide on export priority.** PDF only? PDF + DOCX? PDF + Markdown? Skip export for v1?
Once those five are answered, I can write the actual story decompositions (10-15 stories) for the editor + template work, in the same shape as the verify-email round prompts. Each story will have clear scope, verification, and the new rule-system additions baked in.
This concludes the deep re-evaluation of the template + document editor system. The pattern is the same as everything else we've investigated: there's a strong skeleton, the docs describe a vision more ambitious than the code, and getting from skeleton to vision is a several-month commitment that
---
## Part 12 — Re-Evaluation: Task Management System (World-Class Standard)
### 12.1 Executive summary
You asked for a brutally honest evaluation of the task management system, the same way I did for templates and editor depth. Here it is:
**What you have today:**
- A clean **Task** + **TaskColumn** + **TaskDocumentLink** schema with workspace scoping, soft delete, search vector, and position-based ordering
- A sound **state machine** (5 statuses, role-gated transitions documented in `docs/spec/05-features/05.5-tasks.md:65-85`)
- A **board view** + **list view** with shared task detail drawer at `apps/web/src/features/tasks/`
- Single-assignee + reporter model
- Labels as a string array with regex-validated values
- Realtime presence chip in header, optimistic drag-and-drop, keyboard shortcuts (`n` to create, `/` to focus search, `v b` / `v l` to switch views)
- Document↔Task linking with anchors (your differentiator)
- Comments via the shared `CommentThread` model targeted at `task`
- Solid API contract with 12 endpoints, error codes, validation rules
**What you don't have today (and need for "world-class"):**
- No subtasks (parent/child task hierarchy)
- No dependencies (blocks/blocked-by, related-to)
- No multiple assignees / no watchers / no followers
- No custom fields (free-form key-value, typed)
- No estimate / story points / time tracking
- No recurring tasks
- No milestones / sprints / cycles / iterations
- No saved views / smart filters
- No bulk actions
- No calendar view, timeline/Gantt view, swimlane view, my-tasks view, group-by-anything view
- No analytics (burndown, velocity, throughput, cycle time, lead time)
- No automation rules ("when status changes to done, set assignee to reviewer")
- No task templates
- No checklist/acceptance-criteria inside task detail
- No nested comments visualization in task detail (the data model supports it but the UI is flat)
- No task history / audit log surface
- No keyboard navigation through the board cells (only into search and create)
- No drag-to-reorder columns; columns are template-defined
- No swimlanes by assignee or label
- No archive view (soft-deleted tasks are gone from UI)
- No CSV/Excel import or export
**Honest assessment of the gap:** what you have is a "competent Trello clone." What world-class teams (Linear, Asana, ClickUp, Jira, Height, GitHub Projects v2) have is roughly **6-10x more substantial**. This is the same pattern as templates/editor — you have the skeleton right; the depth isn't there.
### 12.2 What top platforms actually do
Here's the bar you're asking about, broken down by platform identity.
#### Linear
The current king of opinionated task management. Notable features:
- **Hierarchical issues** (parent/sub-issue, infinite depth)
- **Cycles** (1-2 week sprints; auto-rollover; velocity tracking)
- **Projects** (cross-team containers with milestones, target dates, progress)
- **Initiatives** (themes that span multiple projects)
- **Labels** with hierarchy and color
- **Priority** (no, low, medium, high, urgent — visualized with consistent icons)
- **Estimate** (story points with custom scale: linear, fibonacci, exponential)
- **Triage queue** for new bugs/requests
- **Workflows** (custom statuses per team, with state categories: backlog, unstarted, started, completed, cancelled)
- **Status flow rules** (e.g., "completed" auto-archives after 30 days)
- **Custom views** (saved filter + grouping + sort + display options, shareable)
- **Multiple views per issue list:** list, board, timeline, roadmap
- **Cmd+K everything** — universal command palette controls every action
- **Heavy keyboard navigation** (`j/k` to move, `s` to status, `a` to assign, `m` to mention, `e` to edit, every action keyboard-first)
- **Rich text in description** with embeds (github PRs, figma frames, loom videos)
- **Subscriptions** (subscribe to issues, get notified on changes)
- **Smart linking** — paste a github PR URL, becomes embedded card; paste figma URL, embeds frame
- **Github sync** (commits/PRs link to issues, status auto-updates)
- **Slack sync** (channel notifications, thread integration)
- **Insights** dashboards (velocity, throughput, scope-changes, completion rate)
- **Issue templates** with required fields
- **AI features** (auto-summarize, suggest related, group similar)
Linear's design philosophy: **strict opinions, ruthless polish, zero ceremony.** Their biggest weapon is keyboard-first interaction with response times that feel like a native app.
#### Asana
Broader than Linear, more flexible, more configurable.
- **Multi-assignee tasks**
- **Subtasks** (deeply nested)
- **Dependencies** with critical path visualization
- **Custom fields** (text, number, date, dropdown, multi-select, person, formula)
- **Views per project**: list, board, timeline (Gantt), calendar, dashboard, files, conversations, workflow
- **Forms** (create tasks via embedded forms with validation)
- **Rules / automations** ("when assignee changed, set due date to +3 days")
- **Goals** (OKR-style, link tasks to goals, auto-progress)
- **Portfolios** (multiple projects rolled up)
- **Workload view** (capacity planning by person)
- **Time tracking** (per-task or project-level)
- **Reports** (custom + templated)
#### ClickUp
The kitchen-sink option. Has every feature, sometimes overwhelming.
- **Hierarchies**: Workspace > Space > Folder > List > Task > Subtask > Checklist
- **Multiple status sets** (different statuses per list)
- **Custom task types** (bug, feature, epic, etc.)
- **Time tracking with timer**
- **Sprint management** (velocity, burndown)
- **Goals** with target tracking
- **Mind maps** (visual planning)
- **Whiteboards**, **Docs**, **Forms**, **Chat** built into the same product
- **15+ view types** (the most of any platform)
- **AI features** for everything (summarize, generate, suggest, transcribe)
#### Jira
Enterprise standard. Most mature, most opinionated for software engineering.
- **Issue types** (Story, Bug, Task, Epic, Subtask, custom)
- **Sprints** (proper agile sprints, velocity, burndown, retro)
- **Story points + time estimates**
- **Workflow editor** (visual state machine designer per project)
- **JQL** (Jira Query Language — full SQL-like query syntax)
- **Custom fields** (40+ types)
- **Boards**: scrum, kanban, with swimlanes, columns, quick filters
- **Releases / versions**
- **Components** (organize work by area)
- **Screens** (define which fields show in which contexts)
- **Permissions** (issue-level, with custom permission schemes)
- **Workflow validators / conditions / post-functions**
- **Webhooks**, **Marketplace apps** (thousands)
#### GitHub Projects v2
Newer, opinionated, leverages GitHub primitives:
- **Issues are the unit** (no separate task model — everything is an issue or PR)
- **Custom fields** (text, number, date, single-select, iteration)
- **Views**: table, board, roadmap (timeline)
- **Group-by anything** (column, swimlane, by label, by milestone, by assignee, by custom field)
- **Workflows** (auto-add issues on label, auto-update status on close, auto-archive)
- **Insights** (charts, burndown)
- **Built into GitHub** (PRs, commits, code review all integrate natively)
#### Height
A pure software-team-focused tool, modern.
- **Pages, tasks, chat in one** unified data model
- **AI commander** for natural-language commands
- **Smart suggestions** (assignee, label, similar tasks)
- **Real-time everything** (cursor presence, live updates everywhere)
#### Notion
Tasks-as-database — flexible, loose:
- **Database-as-task-list** with infinite custom fields
- **Multiple views per database** (table, board, timeline, calendar, gallery, list)
- **Relations** between databases (link tasks to projects, projects to goals)
- **Rollups** (aggregate from related rows)
- **Formulas** (compute fields)
#### What this tells us
The "world-class" task system is a multi-year effort. Different platforms optimize for different things:
- **Linear** = opinionated software-engineering velocity, keyboard-first, ruthless polish
- **Asana** = cross-functional team collaboration with rich planning
- **ClickUp** = configurability above all (every feature, every option)
- **Jira** = enterprise software with deep workflow control
- **GitHub Projects v2** = lightweight + integrated with code
- **Height** = AI-native, unified data model
- **Notion** = flexibility through generic primitives
You will not become all of these. You will pick a primary identity and excel at it. **Your spec leans toward Linear + Jira hybrid** (status workflows + sprints + academic submissions, software/academic collaboration). That's the right framing.
### 12.3 Specific feature gaps that hurt today
Going through what world-class platforms have that your spec doesn't even mention:
#### Hierarchical structure
- **Subtasks** — Linear, Asana, Jira, ClickUp all have them. You don't.
- **Epics / parent issues** — group related tasks under a theme. You don't.
- **Why this matters:** real software work has natural hierarchy. "Build auth" is not one task; it's 15 sub-tasks. Without hierarchy, users either create flat task lists (loses structure) or use labels as faux-hierarchy (loses parent-rollup).
#### Dependencies
- **Blocks / blocked-by** — Asana, Jira, Linear have them. You don't.
- **Related-to** — informational link. You don't.
- **Why this matters:** project planning needs to express "task B can't start until task A is done." Without dependencies, the system can't show critical path or warn when starting blocked work.
#### Multiple assignees / watchers
- Single-assignee model is intentionally minimalist (Linear's choice). But Asana, Jira allow multi-assignee. Watchers (followers who get notifications) are universal.
- **Why this matters:** for academic projects with team submissions, single-assignee forces a fiction. For professional teams, watchers are the "I want to know about this" pattern.
#### Custom fields
- Every modern platform has custom fields. You have labels (string array), nothing else.
- **Why this matters:** different teams need different metadata. A bug needs a "severity" field; a feature needs a "release version"; a research task needs a "literature reviewed" checkbox. Hard-coding fields forces every team into one shape.
#### Estimates and time
- Story points, time estimates, time tracking — none in your schema.
- **Why this matters:** sprint planning is impossible without estimates. Velocity tracking, burndown, capacity planning — all impossible.
#### Cycles / sprints / milestones
- No first-class concept. The spec mentions "sprint workspace" templates but no recurring iteration concept.
- **Why this matters:** agile teams work in sprints. Academic teams work in milestone-driven projects. Without cycles, every status change is ad-hoc.
#### Saved views and smart filters
- Filters exist transiently in UI state. No saved views, no shared views, no smart filters.
- **Why this matters:** "my open tasks due this week" is a filter every user wants daily. Building it once and saving it is table-stakes. Sharing it with the team is differentiator territory.
#### Bulk actions
- Spec mentions P2. Not built. No multi-select on the board or list.
- **Why this matters:** moving 30 tasks from one milestone to another, one at a time, is a painful UX. Bulk operations are universal in modern tools.
#### Calendar / timeline / gantt views
- Spec mentions P3 calendar/timeline. Not built.
- **Why this matters:** timeline view is how project managers see deadlines and conflicts. Gantt is how dependencies become visible. Calendar is how individuals see their week. Each serves a different cognitive mode.
#### Group-by anything
- Board groups by status. List doesn't group at all.
- **Why this matters:** "show me tasks grouped by assignee" is a manager view. "Group by label" is a planning view. "Group by due-date bucket (today, this week, this month)" is a personal view. Each grouping reveals a different pattern.
#### Analytics
- Spec mentions analytics screen for Manager+. Not detailed. Not built.
- **Why this matters:** "are we shipping faster than last sprint?" is a fundamental question. Without analytics, status meetings turn into spreadsheet exports.
#### Automations / rules
- Not in spec at all.
- **Why this matters:** "when status changes to Done, set assignee to Reviewer" or "when label `urgent` added, set priority to high" — these reduce manual ceremony. Asana, ClickUp, Linear all have them.
#### Templates for tasks
- You have document templates. You don't have task templates.
- **Why this matters:** common task patterns (bug report, feature request, design review) need consistent structure. Without templates, every task is freeform — defeating the spec quality you want.
#### Acceptance criteria / checklists inside task detail
- No first-class checklist field.
- **Why this matters:** "definition of done" is a list of checkable items. Putting them in the description loses tracking. ClickUp, Asana, Notion all have first-class checklists.
#### Task history / audit log
- Not specified. The spec mentions "activity logging for meaningful task events" but the user-facing surface isn't defined.
- **Why this matters:** "who changed the status?" "when was this reassigned?" These are constant questions. Linear shows full history per task; you don't.
#### Real-time presence at task level
- Realtime chip shows connection. No "Sarah is editing this task right now" indicator.
- **Why this matters:** prevents two-person edits clobbering each other. Modern bar.
#### Keyboard navigation through cells
- You have shortcuts to focus search, switch views, create. You don't have `j/k` to move between cards, `Enter` to open, `Esc` to close — Linear-style cell navigation.
- **Why this matters:** keyboard-first users (a serious chunk of your audience for a productivity tool) measure tool quality by how completely they can drive it without touching the mouse.
#### Drag to reorder columns
- Columns are template-defined. No reorder.
- **Why this matters:** users want to customize. "Backlog" on the right vs left. Hidden columns. Column-specific WIP limits. Trello's flexibility here was a defining feature.
#### Swimlanes
- Not in spec.
- **Why this matters:** kanban-by-status with rows-by-assignee gives instant capacity visibility. Single-grouping board misses this.
#### Archive view
- Soft-deleted tasks are gone. No way to find them.
- **Why this matters:** "where did that task go?" is the most-asked question after a delete. Archive view + restore is fundamental.
### 12.4 Schema gaps to support world-class
The current `Task` schema is missing fields that block the features above. To enable them, the schema needs:
```prisma
model Task {
  // ... existing fields ...
  
  // NEW
  parentId          String?      [@map](https://github.com/map)("parent_id") [@db](https://github.com/db).Uuid
  // ^ enables subtasks via self-reference
  
  // NEW
  estimateUnit      EstimateUnit [@default](https://github.com/default)(none) [@map](https://github.com/map)("estimate_unit")
  estimateValue     Decimal?     [@map](https://github.com/map)("estimate_value") [@db](https://github.com/db).Decimal(10, 2)
  // ^ story points or hours
  
  // NEW
  cycleId           String?      [@map](https://github.com/map)("cycle_id") [@db](https://github.com/db).Uuid
  // ^ sprint/cycle membership
  
  // NEW
  milestoneId       String?      [@map](https://github.com/map)("milestone_id") [@db](https://github.com/db).Uuid
  // ^ milestone membership
  
  // NEW
  customFields      Json?        [@map](https://github.com/map)("custom_fields") [@db](https://github.com/db).JsonB
  // ^ workspace-defined custom field values
  
  // NEW
  startDate         DateTime?    [@map](https://github.com/map)("start_date") [@db](https://github.com/db).Date
  // ^ for timeline/gantt
  
  // NEW
  completedAt       DateTime?    [@map](https://github.com/map)("completed_at") [@db](https://github.com/db).Timestamptz(6)
  // ^ when status changed to done; for analytics
  
  // NEW
  archivedAt        DateTime?    [@map](https://github.com/map)("archived_at") [@db](https://github.com/db).Timestamptz(6)
  // ^ archive separately from soft delete
  
  // RELATIONS
  parent            Task?           [@relation](https://github.com/relation)("TaskHierarchy", fields: [parentId], references: [id])
  children          Task[]          [@relation](https://github.com/relation)("TaskHierarchy")
  cycle             Cycle?          [@relation](https://github.com/relation)(fields: [cycleId], references: [id])
  milestone         Milestone?      [@relation](https://github.com/relation)(fields: [milestoneId], references: [id])
  watchers          TaskWatcher[]
  dependencies      TaskDependency[] [@relation](https://github.com/relation)("TaskDependent")
  dependents        TaskDependency[] [@relation](https://github.com/relation)("TaskBlocking")
  checklistItems    TaskChecklistItem[]
  customFieldValues TaskCustomFieldValue[]
  history           TaskHistoryEntry[]
  
  // ... existing relations ...
}
model TaskWatcher {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  taskId      String   [@map](https://github.com/map)("task_id") [@db](https://github.com/db).Uuid
  userId      String   [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  createdAt   DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  task        Task     [@relation](https://github.com/relation)(fields: [taskId], references: [id], onDelete: Cascade)
  user        User     [@relation](https://github.com/relation)(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([taskId, userId])
  @@map("task_watchers")
}
model TaskDependency {
  id              String              [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId     String              [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  dependentTaskId String              [@map](https://github.com/map)("dependent_task_id") [@db](https://github.com/db).Uuid    // the task that's blocked
  blockingTaskId  String              [@map](https://github.com/map)("blocking_task_id") [@db](https://github.com/db).Uuid     // the task that blocks
  type            DependencyType      [@default](https://github.com/default)(blocks)
  createdById     String              [@map](https://github.com/map)("created_by") [@db](https://github.com/db).Uuid
  createdAt       DateTime            [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  dependent       Task [@relation](https://github.com/relation)("TaskDependent", fields: [dependentTaskId], references: [id], onDelete: Cascade)
  blocking        Task [@relation](https://github.com/relation)("TaskBlocking", fields: [blockingTaskId], references: [id], onDelete: Cascade)
  
  @@unique([dependentTaskId, blockingTaskId])
  @@map("task_dependencies")
}
enum DependencyType {
  blocks       // hard: blocking task must finish first
  related      // informational: related context
  duplicates   // this task is a duplicate of blocking
  
  @@map("dependency_type")
}
model TaskChecklistItem {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  taskId      String   [@map](https://github.com/map)("task_id") [@db](https://github.com/db).Uuid
  text        String   [@db](https://github.com/db).VarChar(500)
  isCompleted Boolean  [@default](https://github.com/default)(false) [@map](https://github.com/map)("is_completed")
  position    Decimal  [@db](https://github.com/db).Decimal(20, 10)
  createdAt   DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  task        Task     [@relation](https://github.com/relation)(fields: [taskId], references: [id], onDelete: Cascade)
  
  @@map("task_checklist_items")
}
model TaskHistoryEntry {
  id           String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId  String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  taskId       String   [@map](https://github.com/map)("task_id") [@db](https://github.com/db).Uuid
  actorId      String   [@map](https://github.com/map)("actor_id") [@db](https://github.com/db).Uuid
  action       String   [@db](https://github.com/db).VarChar(50)   // status_changed, assigned, label_added, etc.
  fromValue    Json?    [@map](https://github.com/map)("from_value") [@db](https://github.com/db).JsonB
  toValue      Json?    [@map](https://github.com/map)("to_value") [@db](https://github.com/db).JsonB
  createdAt    DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  task         Task     [@relation](https://github.com/relation)(fields: [taskId], references: [id], onDelete: Cascade)
  actor        User     [@relation](https://github.com/relation)(fields: [actorId], references: [id], onDelete: Restrict)
  
  @@index([taskId, createdAt(sort: Desc)])
  @@map("task_history")
}
model Cycle {
  id            String    [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String    [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  name          String    [@db](https://github.com/db).VarChar(100)
  startDate     DateTime  [@map](https://github.com/map)("start_date") [@db](https://github.com/db).Date
  endDate       DateTime  [@map](https://github.com/map)("end_date") [@db](https://github.com/db).Date
  status        CycleStatus [@default](https://github.com/default)(planned)
  createdAt     DateTime  [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  workspace     Workspace [@relation](https://github.com/relation)(fields: [workspaceId], references: [id], onDelete: Restrict)
  tasks         Task[]
  
  @@map("cycles")
}
model Milestone {
  id          String     [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String     [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  name        String     [@db](https://github.com/db).VarChar(100)
  description String?    [@db](https://github.com/db).Text
  targetDate  DateTime?  [@map](https://github.com/map)("target_date") [@db](https://github.com/db).Date
  status      MilestoneStatus [@default](https://github.com/default)(planned)
  createdAt   DateTime   [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  workspace   Workspace  [@relation](https://github.com/relation)(fields: [workspaceId], references: [id], onDelete: Restrict)
  tasks       Task[]
  
  @@map("milestones")
}
model TaskCustomField {
  id          String              [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String              [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  key         String              [@db](https://github.com/db).VarChar(50)
  label       String              [@db](https://github.com/db).VarChar(100)
  type        CustomFieldType
  config      Json?               [@db](https://github.com/db).JsonB    // options for enum type, format for date, etc.
  required    Boolean             [@default](https://github.com/default)(false)
  position    Decimal             [@db](https://github.com/db).Decimal(20, 10)
  createdAt   DateTime            [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
 values      TaskCustomFieldValue[]
  
  @@unique([workspaceId, key])
  @@map("task_custom_fields")
}
model TaskCustomFieldValue {
  id            String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId   String          @map("workspace_id") @db.Uuid
  taskId        String          @map("task_id") @db.Uuid
  fieldId       String          @map("field_id") @db.Uuid
  value         Json            @db.JsonB
  
  task          Task            @relation(fields: [taskId], references: [id], onDelete: Cascade)
  field         TaskCustomField @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  
  @@unique([taskId, fieldId])
  @@map("task_custom_field_values")
}
model TaskSavedView {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String   @map("workspace_id") @db.Uuid
  ownerId     String   @map("owner_id") @db.Uuid
  name        String   @db.VarChar(100)
  visibility  ViewVisibility @default(private)
  config      Json     @db.JsonB    // filter + group + sort + display options
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  @@map("task_saved_views")
}
enum EstimateUnit {
  none
  hours
  days
  story_points
  
  @@map("estimate_unit")
}
enum CycleStatus {
  planned
  active
  completed
  
  @@map("cycle_status")
}
enum MilestoneStatus {
  planned
  in_progress
  completed
  cancelled
  
  @@map("milestone_status")
}
enum CustomFieldType {
  text
  number
  date
  enum
  multi_enum
  user
  url
  checkbox
  
  @@map("custom_field_type")
}
enum ViewVisibility {
  private
  workspace
  
  @@map("view_visibility")
}
```
That's roughly **9 new models + 5 new enums** to support world-class task management. Each represents a feature class. You don't need them all at once, but they form the architectural target.
### 12.5 Feature priority matrix
Sequencing 30+ features needs a priority framework. Here's how I'd cluster them by impact and effort:
#### Tier 1: Must-have for "professional grade" (P0 / P0.5)
These are universally expected. Without them, the platform feels missing.
1. **Subtasks** (parent_id self-reference) — small data change, big UX unlock
2. **Watchers** — separate table, simple
3. **Task history / audit log** — `TaskHistoryEntry` table + UI panel
4. **Saved views** — `TaskSavedView` table, view config JSON
5. **Bulk actions** — multi-select on board + list, batch mutate
6. **Calendar view** — additional view rendering due dates on calendar grid
7. **Group-by anything** in list view (status, assignee, priority, label)
8. **Archive view** — separate UI to find archived/deleted tasks
9. **Task templates** — same pattern as document templates, applied at create
10. **Real-time presence indicator on task cards** — "Sarah is editing"
11. **Keyboard navigation through cards** — `j/k`, `Enter`, `Esc`, Linear-style
Effort: ~6-8 weeks for all 11.
#### Tier 2: Differentiation (Linear/Asana-tier)
12. **Cycles / sprints** — `Cycle` table + cycle picker on tasks + cycle dashboard
13. **Milestones** — `Milestone` table + milestone picker + roadmap view
14. **Estimates** — story points or hours, summed at cycle/milestone level
15. **Dependencies** — `TaskDependency` table + UI for setting and visualizing
16. **Checklist items** — `TaskChecklistItem` table + UI in task detail
17. **Custom fields** — major undertaking, but unlocks team-specific workflows
18. **Timeline / Gantt view** — show start_date → due_date as bars, with dependency arrows
19. **My tasks page** — global view across all workspaces (or workspace-scoped)
20. **Task analytics** — burndown chart, velocity, throughput
Effort: ~10-14 weeks for all 9.
#### Tier 3: Polish + automation (the world-class layer)
21. **Automation rules** — when X then Y; rule editor UI
22. **Smart filters** — pre-built filter sets (overdue, due this week, my reviews)
23. **Multi-assignee** — change schema, rework UI; controversial choice
24. **Time tracking** — timer in task detail, reports per user/task/cycle
25. **Recurring tasks** — recurrence rule (daily, weekly, custom RRULE)
26. **CSV import / export** — bulk import from Trello/Asana/Jira; export for reports
27. **Webhooks** — external systems get notified of task events
28. **API for third-party integration** — public API endpoints
Effort: ~8-12 weeks for all 8.
#### Tier 4: Advanced (most teams don't need)
29. **Issue typing** (bug, feature, epic) with separate workflows per type
30. **Workflow editor** UI (visual state-machine designer)
31. **JQL-style query language**
32. **Marketplace integrations** (GitHub, Slack, Figma deep integrations)
33. **AI features** — auto-summarize, suggest assignee, group similar tasks
Effort: ~12-20 weeks. Often skipped at MVP scale.
### 12.6 What "academic-grade" tasks need that's specific
Your spec mentions academic workflows. Most task systems are built for software engineering. Academic projects have specific needs:
- **Submission tasks** — task type that produces a graded artifact
- **Reviewer assignment** — supervisor + secondary reviewer fields
- **Grading/feedback fields** — score, written feedback, rubric scores
- **Peer review** — round-robin assignment to other students
- **Plagiarism detection hook** — integration point (Turnitin, etc.)
- **Submission deadline enforcement** — hard cutoffs that lock the task
- **Resubmission rules** — after "changes_requested," allow N more attempts
- **Group submissions** — one task, group of students, single grade
Your existing spec touches submission/review states (`submitted`, `changes_requested`, `approved`) but only at the document level, not the task level. World-class academic task management needs these as first-class concepts.
### 12.7 The current state — re-stated honestly
| Layer | Status |
|---|---|
| Database schema | ✅ Sound foundation, missing 9 models for world-class |
| State machine | ✅ Well-specified, role-gated, 5 statuses |
| API contract | ✅ 12 endpoints, validated, clear errors |
| Board view | ✅ Built, optimistic, drag-and-drop, realtime chip |
| List view | ✅ Built, table + cards, pagination, filters |
| Task detail | ✅ Drawer, editable fields, comments thread, linked resources |
| Search | ⚠️ Search vector in DB, frontend search field — wiring unclear |
| Filters | ✅ Advanced filter panel + active pills |
| Real-time | ⚠️ Connection chip; no per-task presence |
| Subtasks | ❌ Not in schema |
| Dependencies | ❌ Not in schema |
| Watchers | ❌ Not in schema |
| Cycles/sprints | ❌ Not in schema or spec |
| Milestones | ❌ Not in schema or spec |
| Estimates | ❌ Not in schema or spec |
| Custom fields | ❌ Not in schema |
| Checklists | ❌ Not in schema |
| Saved views | ❌ Not in schema or UI |
| Bulk actions | ❌ Spec mentions P2, not built |
| Calendar view | ❌ Not built |
| Timeline/Gantt | ❌ Not built |
| Group-by | ⚠️ Board groups by status only |
| Task templates | ❌ Not modeled |
| Task history | ⚠️ Spec mentions activity logging; no UI |
| Archive view | ❌ Not built |
| Automation rules | ❌ Not in spec |
| Analytics | ❌ Spec mentions P3 |
| Time tracking | ❌ Not in spec |
| Recurring tasks | ❌ Not in spec |
| CSV import/export | ❌ Not in spec |
| Multi-assignee | ❌ Single only |
| Document linking | ✅ Strong differentiator, well-modeled |
| Comments | ✅ Via shared CommentThread |
| Realtime updates | ⚠️ Connection chip; granular updates unclear |
| Keyboard shortcuts | ⚠️ Page-level only; no card navigation |
| Mobile responsive | ⚠️ Header has mobile considerations; full board mobile unclear |
| Accessibility | ✅ Spec requires keyboard alternative to drag, ARIA announcements |
The honest take: you have **roughly 30% of what world-class tasks looks like.** The schema is solid for v1. The spec is reasonable for "starter Kanban with sprints." The UI is polished. But the depth that defines tools like Linear isn't there.
### 12.8 The phased plan to world-class tasks
The same logic that applied to templates/editor applies here. Trying to ship all of this is multi-month work. Phasing matters.
#### Phase TA: Spec re-architecture (1 week, no code)
1. Rewrite `docs/spec/05-features/05.5-tasks.md` to include the full feature taxonomy
2. Add `docs/spec/05-features/05.5a-task-hierarchy.md` (subtasks, parent links)
3. Add `docs/spec/05-features/05.5b-cycles-milestones.md`
4. Add `docs/spec/05-features/05.5c-custom-fields-and-estimates.md`
5. Add `docs/spec/05-features/05.5d-task-views.md` (saved views, group-by, calendar, timeline)
6. Add `docs/spec/05-features/05.5e-task-automations.md`
7. Add `docs/spec/05-features/05.5f-academic-tasks.md`
8. Schema design ADR for the 9 new models
9. Update `docs/agent-ref/api/task-endpoints.md` with new endpoints (subtask, dependency, custom field, view, cycle, milestone)
10. Update `docs/agent-ref/data/task-schema.md`
Output: 8 spec docs + 1 schema ADR. Zero implementation.
#### Phase TB: Tier 1 features (6-8 weeks)
The "must-have" 11 features:
1. Subtasks (DB migration + UI nesting)
2. Watchers (DB + notification preference + UI)
3. Task history (DB + audit + UI panel)
4. Saved views (DB + sharing + UI)
5. Bulk actions (multi-select + batch endpoints)
6. Calendar view (route + render + due-date interactions)
7. Group-by in list (UI mostly, group function pure-frontend)
8. Archive view (UI only; data already soft-deleted)
9. Task templates (extends existing template system to kind=task)
10. Realtime per-task presence (Socket.IO room per task, presence broadcast)
11. Keyboard navigation through cards (jk, Enter, Esc, Linear-style)
Output: tasks feel competitive with Asana / Jira-lite.
#### Phase TC: Tier 2 differentiation (10-14 weeks)
12. Cycles / sprints
13. Milestones
14. Estimates (story points + hours)
15. Dependencies
16. Checklist items
17. Custom fields (the biggest single feature in this phase)
18. Timeline / Gantt view
19. My-tasks page (cross-workspace personal view)
20. Task analytics dashboard
Output: tasks feel competitive with Linear / Height.
#### Phase TD: Tier 3 polish + automation (8-12 weeks)
21. Automation rules + rule editor UI
22. Smart filters (preset filter sets)
23. Multi-assignee (schema + UI rework)
24. Time tracking
25. Recurring tasks (RRULE engine + scheduler)
26. CSV import / export
27. Webhooks
28. Public task API
Output: tasks feel like ClickUp / Asana enterprise tier.
#### Phase TE: Tier 4 advanced (defer)
29-33. Issue typing, workflow editor, query language, marketplace integrations, AI features.
Most of these are 12-20 weeks each. Skip until you have product-market fit and a real team using the tool.
### 12.9 Total realistic effort
Adding it up:
| Phase | Description | Weeks |
|---|---|---|
| TA | Spec re-architecture | 1 |
| TB | Tier 1 (must-have) | 6-8 |
| TC | Tier 2 (differentiation) | 10-14 |
| TD | Tier 3 (polish + automation) | 8-12 |
| TE | Tier 4 (advanced) | optional 12-20+ |
| | **Total to "world-class v1" (excluding TE)** | **25-35 weeks** |
That's roughly **6-9 months of focused engineering** for the task management surface alone. Stacked against the template/editor work (14-19 weeks) and Phase 0 foundations (4-5 weeks), you're looking at 12-18 months total before all surfaces hit world-class.
### 12.10 The recommendation (mirroring §11.10)
Three forks, same shape as before:
**Fork TA: Full world-class.** Commit to 25-35 weeks of task work. Defensible if tasks are your primary product surface. Risky if it's one of many surfaces.
**Fork TB: Professional grade (Linear-lite).** Phase TA + TB + selective TC. Skip custom fields, timeline, multi-assignee. Build:
- Subtasks
- Watchers
- Task history
- Saved views
- Bulk actions
- Calendar
- Group-by
- Cycles + milestones (basic)
- Estimates (story points only)
- Dependencies (blocks/blocked-by only)
- Checklists
- Task templates
- Keyboard navigation
10-12 weeks of work. Gets you to a respectable, opinionated, software-team-ready task system.
**Fork TC: MVP-first.** Just Phase TA + the 5 highest-impact items from Tier 1:
- Subtasks
- Watchers
- Saved views
- Bulk actions
- Calendar view
3-5 weeks. Gets a working "I can run a small team's project here" feature set. Most platforms shipped at this depth and iterated.
**Honest recommendation: Fork TC, then Fork TB once you have users.** Same logic as templates — building world-class without users tells you the wrong things. Get to "good enough for first 100 teams" then let usage data drive the depth investment.
### 12.11 The "academic-grade" overlay
If academic workflows are a primary use case (not just a feature), you need a separate overlay on top of any of the forks above:
#### Academic Task Overlay (separate story arc, ~3-4 weeks)
- Submission task type (extends existing task with grading fields)
- Reviewer assignment field (supervisor + secondary reviewer)
- Grading fields (numeric grade, written feedback, rubric scores)
- Resubmission counter and policy
- Group submissions (multi-assignee with shared grade)
- Hard deadline enforcement (lock task at deadline)
- Plagiarism detection integration point (webhook to Turnitin/equivalent)
This is independent of Fork TA/TB/TC. You can ship it after any fork.
### 12.12 Specific data model additions to ship in Fork TC (the smallest realistic increment)
If you accept Fork TC, the immediate schema additions are minimal:
```prisma
model Task {
  // existing fields stay
  
  // ADD
  parentId    String?  [@map](https://github.com/map)("parent_id") [@db](https://github.com/db).Uuid
  archivedAt  DateTime? [@map](https://github.com/map)("archived_at") [@db](https://github.com/db).Timestamptz(6)
  startDate   DateTime? [@map](https://github.com/map)("start_date") [@db](https://github.com/db).Date  // for calendar view
  
  parent      Task?   [@relation](https://github.com/relation)("TaskHierarchy", fields: [parentId], references: [id])
  children    Task[]  [@relation](https://github.com/relation)("TaskHierarchy")
  watchers    TaskWatcher[]
}
model TaskWatcher {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  taskId      String   [@map](https://github.com/map)("task_id") [@db](https://github.com/db).Uuid
  userId      String   [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  createdAt   DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  task        Task     [@relation](https://github.com/relation)(fields: [taskId], references: [id], onDelete: Cascade)
  user        User     [@relation](https://github.com/relation)(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([taskId, userId])
  @@map("task_watchers")
}
model TaskSavedView {
  id          String         [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String         [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  ownerId     String         [@map](https://github.com/map)("owner_id") [@db](https://github.com/db).Uuid
  name        String         [@db](https://github.com/db).VarChar(100)
  visibility  ViewVisibility [@default](https://github.com/default)(private)
  config      Json           [@db](https://github.com/db).JsonB
  createdAt   DateTime       [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  @@map("task_saved_views")
}
enum ViewVisibility {
  private
  workspace
  
  @@map("view_visibility")
}
```
Two models added, three columns added, one enum. That's the cost of unlocking the 5 Fork TC features. Cheap.
### 12.13 The hardest honest take (mirroring §11.18)
Same shape as the template re-evaluation. You said "world-class which will make top engineers impressed and needy." Building a task system that competes with Linear is its own product surface that companies have built billion-dollar businesses on (Atlassian, Asana, Linear, ClickUp). The bar is high.
If you commit to it, defenses you should put in place:
1. **Time-box phases.** Each phase has a 2-4 week budget. Past budget, stop and reassess.
2. **Ship behind feature flags.** New view types behind `experimental.timeline-view`. Subtasks behind `experimental.subtasks` until stable.
3. **Use real users early.** Phase TC's 5 features should ship to beta users before Phase TB starts. If users don't use saved views, you've learned something — adjust priorities.
4. **Document every decision** as ADRs. The "why single-assignee not multi" decision is going to be revisited; capture context now.
5. **Measure quality continuously.** Linear's reputation is built on speed. Pin it: time-to-render board (TTRB), time-to-create-task (TTCT), edit latency. World-class is sub-100ms.
### 12.14 What this means for the project plan (cumulative)
Adding tasks to the larger roadmap we've discussed across all the investigations:
**Phase 0 (foundations): NestJS, Vitest, fixtures, observability, CI hardening, DB safety** — 4-5 weeks
**Phase 1 (production readiness): prod env, security scanning, real integration tests, coverage** — 4-6 weeks
**Phase 1.5 (file uploads + S3 storage)** — 2 weeks (required for image/attachment in editor and tasks)
**Phase 2 (editor depth, Fork B / professional)** — 6-8 weeks
**Phase 2.5 (real templates: 5-10 templates)** — 2-3 weeks
**Phase 3 (diagrams + export)** — 3-4 weeks (mermaid + PDF)
**Phase 4 (collab depth: comments-on-selection, suggest mode)** — 4-6 weeks (parallel-able)
**Phase 5 (tasks Fork TC: 5 must-haves)** — 3-5 weeks
**Phase 6 (tasks Fork TB: Linear-lite)** — 6-7 weeks
**Phase 7 (academic task overlay)** — 3-4 weeks
**Phase 8+ (advanced tier — Tier 3 + 4 from §12.5)** — open-ended
Cumulative: roughly **40-55 weeks** to ship a "world-class v1" across all surfaces. That's 10-13 months. Realistic with one focused engineer + AI tooling. Not realistic for a side project.
### 12.15 What you should decide before any task work begins
Same shape as the prior re-evaluations:
1. **Pick a fork: TA, TB, or TC.** Tell me which.
2. **Confirm priority order.** Tasks before or after editor depth? Before or after Phase 0?
3. **Decide on the schema additions.** Subtasks via parent_id? Watchers as separate table? Custom fields as JSONB or normalized?
4. **Decide on academic overlay timing.** Ship after generic tasks, or interleave?
5. **Decide on view types priority.** Calendar before timeline? Group-by before bulk actions?
Once those five are answered, I can write the actual story decompositions for the task work, in the same shape as everything else.
### 12.16 Closing on tasks
Your task system today is a competent Kanban implementation. The schema is sound. The UI is polished. The state machine is well-designed. The doc-task linking is genuinely differentiating.
But "world-class" — the bar that makes engineers go "this is better than Linear/Jira/Asana for my use case" — is roughly 6-9 months of focused work away. The honest path forward is the same path I recommended for templates and editor: pick a smaller scope (Fork TC), ship it, learn from users, then invest deeper.
The decisions matrices across all five investigations (NestJS, testing, infra, agent rules + frontend + memory, collab, templates + editor, tasks) now total roughly **45 questions**. The simplest move you can make is to tell me which 3-5 are your top priorities right now, and I'll write the first execution prompt for whichever cluster you point to.
This concludes the deep re-evaluation of the task management system. Same pattern as everything else: strong skeleton, deep gap to world-class, honest scope choice required upfront, phased execution to avoid the verify-email-style multi-round failure mode.
---
## Part 13 — Re-Evaluation: Comment System (World-Class Standard)
### 13.1 Executive summary
**What you have today:**
- A clean **CommentThread + Comment + CommentMention** schema with workspace scoping, soft delete, status (open/resolved), anchor JSONB for inline document comments
- Two **target types**: `document` and `task` (extensible enum)
- **Author snapshots** (`authorNameSnapshot`, `authorAvatarSnapshot`) — preserves attribution even if user is later deleted; this is a strong choice
- **Content stored as Tiptap/ProseMirror JSON** (rich text, not plain markdown) with derived plaintext for search
- **Mentions** modeled as separate table with unique constraint per (commentId, mentionedUserId)
- **Edit windows by role** (15min Member, 30min Manager, 1h Admin/Owner) — well-specified
- **Resolve thread** action limited to Manager+ — well-specified
- **Realtime events** specified: `comment:thread_created`, `comment:created`, `comment:updated`, `comment:deleted`, `comment:thread_resolved`, `comment:thread_reopened`
- API endpoints: create/list/edit/delete/resolve, with role checks, archived-workspace guards, anchor validation, mention validation
- The schema and spec are **genuinely strong** — better than 80% of platforms
**What you don't have:**
- **No reactions / emoji** (this is universal in modern tools — Slack-tier)
- **No comment attachments** (no images, files, screenshots)
- **No nested replies tree** — UI is chronological flat list within a thread; no reply-to-reply visualization
- **No comment versioning / edit history** — once edited, prior version is gone
- **No quoted replies** ("Sarah said: ..." inline)
- **No code blocks / inline code formatting** in comments (technically supported via Tiptap but no toolbar/UI)
- **No GIFs / Giphy / image links**
- **No voice / video / loom-style embed** in comments
- **No comment templates / canned responses**
- **No saved drafts** (lose comment if you navigate away)
- **No "@channel" / "@everyone" / role mentions** (e.g., `@admins`)
- **No mention groups** (e.g., `@reviewers` → all reviewers)
- **No comment-permalink / shareable URL with deep-link** to specific comment
- **No comment search globally** (search only via document/task search vectors)
- **No comment bookmarks / save for later**
- **No "watch this thread" subscription** independent of mentions
- **No cross-document/cross-task linking** in comments (no rich preview when pasting a task URL)
- **No comment reactions roll-up** (top-level "5 ✅, 2 👀" summary)
- **No edit indicator** (Slack shows "edited" badge with hover for time; you have updatedAt but UI surface unclear)
- **No undo-send** (Gmail-style 30-second undo)
- **No threaded read state** (which threads have new comments since last visit)
- **No collapsed-thread default** for resolved comments in document view
- **No suggestion mode integration** (suggested edit → comment thread)
- **No comment AI features** (summarize thread, suggest reply, improve tone)
- **No comment moderation tools** (flag, hide, mass-delete by author)
- **No private comments** (notes only visible to author until published)
### 13.2 What top platforms do
**Slack-tier (chat-first):**
- Reactions (emoji palette + custom emoji)
- Threaded replies (visible as side panel)
- File attachments inline (drop a screenshot, it embeds)
- Edit history with "edited" badge
- Pin to channel / save for later
- Channels (room concept, not applicable here but informative)
- Search across all messages
- Slash commands (`/giphy`, `/remind`)
- Voice clips, video clips, screen recordings (Slack Clips)
- Huddles (voice/video) per channel
- AI summarize (Slack AI summarizes long threads)
**Notion comments:**
- Reactions
- Inline rich text (bold, italic, links, code, mentions, page links)
- Mentions of people, pages, dates
- Nested replies (one level)
- Resolve / unresolve
- Linked comments back to original block
- Comment search
- Email reply-to-comment
**Linear comments on issues:**
- Markdown-native
- Reactions
- Mention people, issues, projects, cycles
- Code blocks with syntax highlighting
- Image upload + paste
- Edit history shows previous versions
- Permalink to specific comment
**GitHub PR comments:**
- Suggested changes (proposed code blocks that can be applied)
- Reactions on every comment (8 emoji)
- Threaded conversations on lines
- Resolve conversation
- Quote reply
- Edit history
- @mention with role-based fan-out (e.g., `@org/reviewers`)
- Saved replies (canned responses)
- Hide / report comments
- Code block syntax highlighting
**Figma comments:**
- Pinned to specific coordinate on canvas
- Reactions
- Rich text + image attachments
- Mentions
- Resolve
- Comments visible/hidden per user (toggle)
**Google Docs comments:**
- Threaded
- Resolve
- Mentions with email assign-to
- Suggestion mode integration (suggested edit → comment thread)
- Email reply
- @doc mentions create suggestions
### 13.3 The schema gaps to support world-class
```prisma
model Comment {
  // existing fields stay
  
  // ADD
  parentCommentId   String?  [@map](https://github.com/map)("parent_comment_id") [@db](https://github.com/db).Uuid
  // ^ enables nested-reply visualization
  
  // ADD
  isPrivate         Boolean  [@default](https://github.com/default)(false) [@map](https://github.com/map)("is_private")
  // ^ private notes vs public comments
  
  // ADD  
  editedAt          DateTime? [@map](https://github.com/map)("edited_at") [@db](https://github.com/db).Timestamptz(6)
  // ^ explicit edit timestamp (separate from updatedAt that includes resolution edits)
  
  parentComment     Comment? [@relation](https://github.com/relation)("CommentReply", fields: [parentCommentId], references: [id])
  replies           Comment[] [@relation](https://github.com/relation)("CommentReply")
  reactions         CommentReaction[]
  attachments       CommentAttachment[]
  editHistory       CommentEditHistory[]
}
model CommentReaction {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  commentId   String   [@map](https://github.com/map)("comment_id") [@db](https://github.com/db).Uuid
  userId      String   [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  emoji       String   [@db](https://github.com/db).VarChar(50)   // shortcode like ":thumbs_up:" or unicode
  createdAt   DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  comment     Comment  [@relation](https://github.com/relation)(fields: [commentId], references: [id], onDelete: Cascade)
  user        User     [@relation](https://github.com/relation)(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([commentId, userId, emoji])
  @@index([commentId])
  @@map("comment_reactions")
}
model CommentAttachment {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  commentId   String   [@map](https://github.com/map)("comment_id") [@db](https://github.com/db).Uuid
  fileId      String   [@map](https://github.com/map)("file_id") [@db](https://github.com/db).Uuid
  position    Int      [@default](https://github.com/default)(0)
  createdAt   DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  comment     Comment  [@relation](https://github.com/relation)(fields: [commentId], references: [id], onDelete: Cascade)
  file        File     [@relation](https://github.com/relation)(fields: [fileId], references: [id], onDelete: Restrict)
  
  @@map("comment_attachments")
}
model CommentEditHistory {
  id            String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  commentId     String   [@map](https://github.com/map)("comment_id") [@db](https://github.com/db).Uuid
  contentBefore Json     [@map](https://github.com/map)("content_before") [@db](https://github.com/db).JsonB
  editedById    String   [@map](https://github.com/map)("edited_by") [@db](https://github.com/db).Uuid
  editedAt      DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("edited_at") [@db](https://github.com/db).Timestamptz(6)
  
  comment       Comment  [@relation](https://github.com/relation)(fields: [commentId], references: [id], onDelete: Cascade)
  editedBy      User     [@relation](https://github.com/relation)(fields: [editedById], references: [id], onDelete: Restrict)
  
  @@index([commentId, editedAt(sort: Desc)])
  @@map("comment_edit_history")
}
model CommentSubscription {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  threadId    String   [@map](https://github.com/map)("thread_id") [@db](https://github.com/db).Uuid
  userId      String   [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  createdAt   DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  thread      CommentThread [@relation](https://github.com/relation)(fields: [threadId], references: [id], onDelete: Cascade)
  user        User          [@relation](https://github.com/relation)(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([threadId, userId])
  @@map("comment_subscriptions")
}
```
5 new models: reactions, attachments, edit history, subscriptions, plus parent_comment_id on existing Comment. Each unlocks a feature class.
### 13.4 The phased plan for comments
**Tier 1 (must-have, ~3-4 weeks):**
- Reactions (table + UI palette + realtime sync)
- Comment attachments (depends on file upload infrastructure landing)
- Quote reply (UI only — uses existing Tiptap rendering)
- Edit indicator + history (table + "edited" badge with hover for previous versions)
- Permalink / deep-link to specific comment
- Saved drafts (localStorage; no schema change)
- Threaded reply visualization (parent_comment_id + indented rendering)
**Tier 2 (differentiation, ~2-3 weeks):**
- Subscribe to thread (CommentSubscription table)
- Watch indicators (which threads have unread)
- Comment search globally (search vector on content_plaintext)
- Mention groups (`@reviewers` → workspace role-based fan-out)
- Suggestion mode integration (link to editor's suggest mode if/when it lands)
**Tier 3 (advanced, ~3-4 weeks):**
- AI summarize long thread
- Smart reply suggestions
- Voice/video clip recording in comments
- Cross-doc/cross-task rich previews when URL pasted
- Email reply-to-comment (inbound mail processing)
**Tier 4 (deferred):**
- Slack-style channels-on-task
- Live huddle in comment thread
- Reactions roll-up dashboards
Total to "world-class v1" comments: ~8-11 weeks. Smaller scope than templates/editor or tasks because the surface is narrower.
### 13.5 The frontend reality
The comment UI already exists inside task and document detail views (per the schema, `commentCount` shows on task cards, comments thread is in task detail). What's specifically missing on the frontend:
- No reaction picker (Slack-style emoji palette)
- No "edited" badge with hover-for-previous-content
- No permalink button on individual comments
- No nested/threaded visualization (replies are flat chronological)
- No saved-draft auto-save
- No comment-search affordance
- No "+ Subscribe to thread" toggle
- No quote-reply quick action
- No image paste / drag-drop into comment composer
- No mention-group autocomplete (`@reviewers`)
- No collapsed-resolved threads on document view
- No comment density preference (compact vs comfortable)
### 13.6 What makes the current design genuinely strong
Worth calling out — your comment system has several decisions that are better than most platforms:
1. **Author snapshots in `authorNameSnapshot` + `authorAvatarSnapshot`** — preserves attribution after user deletion. Slack and Notion both lose this; you keep it. Strong choice.
2. **Tiptap JSON content** instead of markdown or plain text — lets you render rich content faithfully, supports mentions as structured tokens (not regex-parsed strings).
3. **CommentMention as separate table with unique constraint** — prevents duplicate notifications on a single comment that mentions someone twice. Many platforms get this wrong.
4. **Anchor as JSONB with quote/hash/headingPath fallback** — graceful degradation when document edits invalidate the anchor. This is non-trivial to design well.
5. **Edit window tiered by role** — sensible, prevents abuse without locking down legitimate corrections.
6. **Resolve as Manager+ only** — prevents random users from closing important threads.
7. **CommentTargetType enum** — extensible to future targets (e.g., file comments, image comments, code review comments).
These are quality decisions. Don't lose them while adding features.
### 13.7 The decision you need to make for comments
Same shape as everywhere else:
**Fork CA: Full world-class.** Tier 1 + 2 + 3, 8-11 weeks. Best comment system in academic/professional collab category.
**Fork CB: Tier 1 only (~3-4 weeks).** Reactions, attachments, threading, permalinks, edit history. This brings comments to "Notion-tier" without huge investment.
**Fork CC: Defer all.** Current comments are genuinely good. Ship as-is until users complain. Probably 6+ months before complaints accumulate.
**Honest recommendation: Fork CB.** Tier 1 features are universal expectations now (reactions especially). Without reactions, comments feel "old internet" — and reactions take 1-2 weeks alone. Tier 1 as a single 3-4 week story arc is the right cost/value sweet spot.
---
## Part 14 — Re-Evaluation: File / Folder Tree System (World-Class Standard)
### 14.1 Executive summary
**What you have today:**
- A clean **Folder model** with workspace scoping, parent-child self-reference, fractional position-based ordering, soft delete
- **10-level nesting limit**, cycle prevention specified at application layer
- **Document tree endpoint** (`GET /documents/tree`)
- **Folder CRUD** endpoints with validation (`INVALID_PARENT`, `FOLDER_NOT_EMPTY`, `FOLDER_NOT_FOUND`)
- **Tree view UI** in `apps/web/src/features/documents/components/document-tree.tsx` with:
  - Recursive rendering with depth-based indentation
  - Expand/collapse all, individual toggle
  - Context menu (new doc, new folder, rename, delete)
  - Empty states for tree and per-folder
  - Keyboard navigation (Arrow keys, Enter, Space)
  - ARIA tree role with `treeitem`, `aria-expanded`, `aria-level`
  - Visual hierarchy guides (vertical lines connecting parents to children)
  - Folder count badge
- **Permissions** workspace-scoped (no folder-level ACLs in v1)
**What you don't have:**
- **No drag-and-drop** in the tree (spec mentions it, code uses `prompt()` for rename, no DnD library wired)
- **No file attachments** (File and Attachment models referenced in schema but not in tree UI)
- **No favorites / starred / pinned** (no Document-level "starred" field)
- **No recent files list**
- **No "shared with me"** view
- **No cross-workspace search of documents**
- **No multi-select for bulk move/delete**
- **No "move to..." dialog** with tree picker
- **No tree-search filter** (no search box in tree to filter visible folders/docs)
- **No bulk-import** (drag a folder of markdown files; no bulk creation)
- **No "Files" surface** separate from documents (you have File model in schema but no UI)
- **No public sharing / publish** (no "share this doc with the world" pattern)
- **No document permissions** (per-doc viewer/editor/no-access overrides)
- **No "trash"** view (soft-deleted items have no UI; permanently lost from user perspective)
- **No rename inline** (uses `prompt()` browser dialog — rough UX)
- **No realtime tree updates** when others create/move/delete (the connection chip exists but tree-level realtime sync isn't visible)
- **No drag handles** for reorder
- **No nesting indicators** (count of children visible but no "depth: 3" badge)
- **No breadcrumbs** in document detail showing folder path
- **No "go to parent folder" / "open enclosing folder" actions**
- **No keyboard-driven navigation through whole tree** (current keyboard support is per-folder toggle only)
- **No sort options** (always by position; no "sort by name" or "sort by recently modified")
- **No view modes** (list, grid, gallery)
- **No file/folder icons customization** (always teal/grey defaults)
- **No tree state persistence** (expand state resets on reload — but current code expands all on load, which is its own usability issue at scale)
- **No "templates" folder** as a special folder type
- **No archive folder** as a special folder type
- **No private folder** (only-mine within a workspace)
- **No collaborative folder marker** (multiple people active in this folder)
- **No file move audit log** ("moved from X to Y by Z at T")
- **No file-name validation** beyond length 120 chars (no slug validation, no reserved-name protection)
- **No tag-based organization** (alternative to folders)
### 14.2 What top platforms do
#### Notion (page tree)
- **Infinite nesting** (no 10-level limit)
- **Pages within pages** — no separate "folder" concept; every page can contain other pages
- **Drag and drop** with visual drop indicators (above/below/inside)
- **Multi-select** with shift-click and cmd-click
- **Star / favorite** any page
- **Recently visited** in sidebar
- **Templates folder** as a top-level concept (workspace template library)
- **Shared section** vs private section
- **Inline page mentions** in any page that link bidirectionally
- **Per-page permissions** (full access, edit, comment, view, no access)
- **Public publish** (one-click "Share to web" with custom domain)
- **Trash** view with restore
- **Workspace search** (global, full-text)
- **No sort options** (manual order via drag)
- **Realtime tree updates** (Sarah moves a page, you see it move)
#### Confluence (page hierarchy)
- **Spaces** as top-level container (your "workspace" maps to this)
- **Page tree** within space
- **Templates folder** dedicated
- **Page restrictions** (per-page permissions)
- **Page properties** (metadata) used for filtered views
- **Likes / favorites** at page level
- **Move dialog** with full tree picker
- **Bulk page move**
- **Page reordering** via drag
- **Recently viewed** sidebar
- **Watching pages / spaces** for notifications
#### Google Drive (folder tree)
- **Infinite folder nesting**
- **Star / favorite**
- **Recent**, **Shared with me**, **Trash** as top-level views
- **Multi-select** with shift, cmd
- **Drag-and-drop** to move
- **Right-click menu** with rich options (download, share, copy link, manage versions)
- **Per-file permissions** (anyone with link, specific people, public)
- **Two-step trash** (trashed → permanently deleted after 30 days)
- **Color-coded folders**
- **Custom folder icons** (limited to color)
- **Shared drives** (separate from My Drive — alternative org structure)
- **Search by file type, owner, date, etc.**
#### GitHub (file tree)
- **Repo as top-level**
- **Folder tree** with infinite nesting
- **Default sort: alphabetical** (no manual order in repos; folders before files)
- **Search code, issues, PRs** globally
- **File search within repo** (T to focus)
- **Breadcrumb** at top of file view
- **Star repos** (not files)
- **Watch repo** for notifications
- **Branch and tag versions** (alternative organization axis)
- **Submodules** (git-specific)
#### Linear (no native file tree)
Linear deliberately doesn't have a file tree. Issues and projects are flat with relationships. Worth noting that some platforms succeed by **not** having hierarchical files.
### 14.3 Where the spec is missing
Going through the spec, here's what's not yet documented:
1. **No spec on drag-and-drop interaction details.** Your `docs/spec/05-features/05.4-documents.md:73-77` says "drag-and-drop reorder is supported" but doesn't define the interaction (drop indicators, visual feedback, animation, undo).
2. **No spec on tree realtime updates.** Hocuspocus handles document content; what handles tree-structure realtime? The spec doesn't say. Likely Socket.IO via the `workspace:<workspaceId>` room, but no event names or payloads defined for tree mutations.
3. **No spec on favorites / starred.** Common feature, not mentioned.
4. **No spec on "recently viewed" / "recent files".** Universal, not mentioned.
5. **No spec on "shared with me" or per-doc permissions.** Spec is workspace-scoped only. v1.5+ would need this.
6. **No spec on file uploads** beyond "P2 file storage." File and Attachment models exist in DB but no specs cover the upload flow, file types, size limits, virus scanning, preview rendering, multi-version files.
7. **No spec on trash / restore.** Soft delete is in schema. UI is silent.
8. **No spec on bulk operations** on tree (multi-select, bulk move, bulk delete).
9. **No spec on tree search / filter.** Document search exists; tree-level filter (typeahead inside the tree) doesn't.
10. **No spec on icon customization.** Notion lets you set emoji per page; you don't.
11. **No spec on cover images** at folder/document level.
12. **No spec on tree virtualization** (rendering 10k items without performance death).
13. **No spec on tree state persistence** — should expand state survive reload? Should it sync per user? Per workspace?
14. **No spec on rename UX.** The current code uses `prompt()` which is brutal. Inline rename or modal isn't specified.
### 14.4 The schema gaps to support world-class file tree
Beyond what's already in place:
```prisma
model Document {
  // existing fields stay
  
  // ADD
  isStarred     Boolean   [@default](https://github.com/default)(false) [@map](https://github.com/map)("is_starred")
  // ^ if per-user starring, move to a separate UserDocumentStar table instead
  
  // ADD
  icon          String?   [@db](https://github.com/db).VarChar(50)
  // ^ emoji or icon identifier
  
  // ADD
  coverImageUrl String?   [@map](https://github.com/map)("cover_image_url") [@db](https://github.com/db).VarChar(500)
  // ^ optional cover image
  
  // ADD
  isPublished   Boolean   [@default](https://github.com/default)(false) [@map](https://github.com/map)("is_published")
  publishedSlug String?   [@map](https://github.com/map)("published_slug") [@db](https://github.com/db).VarChar(120)
  // ^ public sharing
}
model Folder {
  // existing fields stay
  
  // ADD
  icon          String?   @db.VarChar(50)
  description   String?   @db.VarChar(280)
  isArchive     Boolean   @default(false) @map("is_archive")
  // ^ marks special "archive" folder per workspace
}
model UserDocumentStar {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String   @map("workspace_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  documentId  String   @map("document_id") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  @@unique([userId, documentId])
  @@map("user_document_stars")
}
model UserDocumentRecent {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String   @map("workspace_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  documentId  String   @map("document_id") @db.Uuid
  visitedAt   DateTime @map("visited_at") @db.Timestamptz(6)
  
  @@unique([userId, documentId])
  @@index([userId, visitedAt(sort: Desc)])
  @@map("user_document_recents")
}
model DocumentPermission {
  id           String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId  String           @map("workspace_id") @db.Uuid
  documentId   String           @map("document_id") @db.Uuid
  userId       String?          @map("user_id") @db.Uuid       // user-specific override
  groupId      String?          @map("group_id") @db.Uuid      // future: group-based
  permission   DocumentPermissionLevel
  grantedById  String           @map("granted_by") @db.Uuid
  grantedAt    DateTime         @default(now()) @map("granted_at") @db.Timestamptz(6)
  
  @@unique([documentId, userId])
  @@map("document_permissions")
}
enum DocumentPermissionLevel {
  no_access
  view
  comment
  edit
  full
  
  @@map("document_permission_level")
}
model File {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId  String   @map("workspace_id") @db.Uuid
  uploadedById String   @map("uploaded_by") @db.Uuid
  fileName     String   @db.VarChar(255)
  mimeType     String   @db.VarChar(100)
  sizeBytes    BigInt   @map("size_bytes")
  storageProvider String  @default("s3") @map("storage_provider") @db.VarChar(20)
  storageKey   String   @map("storage_key") @db.VarChar(500)
  status       FileStatus @default(uploading)
  scanStatus   FileScanStatus? @map("scan_status")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz(6)
  
  @@index([workspaceId, createdAt(sort: Desc)])
  @@map("files")
}
enum FileStatus {
  uploading
  ready
  failed
  
  @@map("file_status")
}
enum FileScanStatus {
  pending
  clean
  infected
  failed
  
  @@map("file_scan_status")
}
```
That's roughly **5 new models + 3 new enums + 4 new columns** to support world-class file/folder tree.
### 14.5 The phased plan for file tree
#### Tier 1 (must-have, ~3-4 weeks)
1. **Drag-and-drop with visual indicators** (use `@dnd-kit/core` — modern, accessible, performant)
2. **Inline rename** (replace `prompt()` with an in-place editable input)
3. **Multi-select + bulk move/delete**
4. **"Move to..." dialog with tree picker**
5. **Trash view** with restore action (uses existing soft-delete)
6. **Star / favorite documents** (per-user, separate table)
7. **Recent files** sidebar section (UserDocumentRecent)
8. **Realtime tree updates** via Socket.IO `workspace:<id>` room
#### Tier 2 (Notion-tier, ~3-4 weeks)
9. **Icons / emoji per document and folder**
10. **Tree-search / filter** (typeahead inside the tree)
11. **Sort options** (manual / alphabetical / recent)
12. **Tree state persistence** (which folders expanded, per user, per workspace)
13. **Breadcrumbs** in document detail
14. **"Open enclosing folder"** action
15. **Better keyboard navigation** (j/k between nodes, Enter open, Cmd+R rename, Del delete)
#### Tier 3 (advanced, ~4-6 weeks)
16. **File upload + attachment support** (S3 via signed URLs, virus scan via worker, MIME-type validation, preview rendering)
17. **Per-document permissions** (override workspace-level)
18. **Public sharing / publish** (custom slug, password protect, view-only)
19. **Cover images** for documents
20. **Tree virtualization** for 10k+ items (react-virtual or tanstack-virtual)
21. **Document copy / duplicate** action
22. **Tag-based organization** as alternative to folders
#### Tier 4 (defer)
- Shared drives / cross-workspace folders
- Custom folder colors
- Folder permissions (separate from document permissions)
- Public folder pages (Notion-style "Share to web" at folder level)
- Page mentions with bidirectional linking visualization
- Workspace-level search across all content
Total to "world-class v1" file tree: ~10-14 weeks.
### 14.6 The current frontend reality is uneven
Reading the actual `document-tree.tsx`, there's a quality contrast:
**What's polished:**
- Visual hierarchy with vertical guide lines connecting parents to children
- Group hover states for context menu reveal
- Folder-open vs folder-closed iconography
- Empty states per-folder
- Workspace files count badge
- Expand-all / collapse-all controls
- ARIA `role="tree"`, `treeitem`, `aria-expanded`, `aria-level`
- Keyboard-arrow handling for expand/collapse
**What's rough:**
- Rename uses `prompt()` browser dialog — feels 2005
- Delete uses `confirm()` browser dialog — same era
- No drag-and-drop despite spec requiring it
- "Empty folder" text is italic gray — no CTA to create something
- Expand-all on initial load can be performance-heavy with deeply nested trees
- All operations are local state; no API calls visible (mock-driven)
- No optimistic updates with rollback path
- No realtime sync to other users
The polish gap is the same as everywhere: the chrome looks Linear-tier, the depth is starter-tier.
### 14.7 What makes the current design genuinely strong
Not all critique. Worth calling out the good decisions:
1. **`onDelete: Restrict` on Folder.parent** — prevents accidental cascade-delete of subtrees. Strong.
2. **`onDelete: Restrict` on Folder.children** — child folders/docs survive parent rename or other operations. Strong.
3. **Application-layer cycle prevention** — schema-level constraint would be hard; app-layer with explicit error code is right.
4. **Fractional position-based ordering** — supports drag-and-drop reorder without expensive resequencing. Strong.
5. **`FOLDER_NOT_EMPTY` blocking delete in v1** — forces explicit cleanup, prevents accidental data loss. Strong opinionated default.
6. **10-level depth limit** — prevents pathological nesting that breaks rendering performance. Notion has bitten itself with infinite nesting.
These are quality choices that put you ahead of GitHub-style alphabetical-only file trees and protect against common pitfalls.
### 14.8 The decision you need to make for file tree
**Fork FA: Full world-class.** Tier 1 + 2 + 3, ~10-14 weeks. Best-in-class file tree.
**Fork FB: Tier 1 (~3-4 weeks).** Drag-and-drop, inline rename, multi-select, move dialog, trash view, star, recent, realtime. Brings the tree to "Notion-lite" without massive investment.
**Fork FC: Inline rename + drag-and-drop only (~1.5-2 weeks).** Just the worst-feeling rough edges (`prompt()`-based rename and missing DnD). Cheap, high-impact.
**Honest recommendation: Fork FC first, then FB.** The `prompt()`-based rename is genuinely embarrassing UX. Replace it. Add drag-and-drop. That's 2 weeks for a perception shift from "starter" to "competent." Then Fork FB another 3-4 weeks later if usage data justifies.
### 14.9 The cumulative cost across all surfaces
Tying together everything we've investigated across Parts 11-14:
| Surface | Fork choice | Weeks |
|---|---|---|
| Phase 0 foundations | Already discussed | 4-5 |
| Phase 1 production readiness | Already discussed | 4-6 |
| Phase 1.5 file uploads + S3 | Required | 2 |
| Editor depth (Fork B / professional) | §11.10 | 6-8 |
| Real templates | §11.10 follow-on | 2-3 |
| Diagrams + export | §11.10 follow-on | 3-4 |
| Tasks (Fork TC: 5 must-haves) | §12.10 | 3-5 |
| Tasks (Fork TB: Linear-lite) | §12.10 | 6-7 |
| Comments (Fork CB: Tier 1) | §13.7 | 3-4 |
| File tree (Fork FB: Tier 1) | §14.8 | 3-4 |
| Collab depth | §6.1 | 4-6 |
| **Cumulative** | "professional grade" everywhere | **40-54 weeks** |
That's **9-13 months** of focused engineering for "professional grade" across all surfaces. World-class everywhere is 18-24 months.
### 14.10 The unifying recommendation across all surfaces
The pattern is identical for every surface we've investigated. Same logic applies:
1. **Don't pursue world-class on every surface simultaneously.** Pick 1-2 surfaces where being world-class is your differentiation. The rest land at professional-grade and ship.
2. **Your differentiation is document↔task linking and academic workflow.** That's where world-class investment pays back. Make those two surfaces deep and beautiful.
3. **Everything else is professional-grade.** Comments, file tree, basic editor — Notion-tier is enough. Don't try to beat Notion at general-purpose docs; you'll lose.
4. **Use Phase 0 + 1 to make the foundation strong** so adding professional-grade features is fast (3-4 weeks each, not 8-12).
5. **Ship a coherent v1 within 6-9 months.** Get to users. Let usage data tell you which surface to deepen toward world-class.
This concludes the deep re-evaluation of the comment system and file/folder tree. Across Parts 11-14 we've now mapped four surfaces (templates+editor, tasks, comments, file tree) with the same structure: skeleton, gaps, top-platform comparison, schema additions, phased plan, fork choice, honest recommendation.
The accumulated decision matrix across the entire investigation now totals roughly **55 distinct architecture/scope choices**. Continuing to investigate without making decisions past a certain point stops producing new signal — we've reached that point.
### 14.11 What you need to do next
Three paths forward, pick one:
**Path 1: Decide everything now.**
Sit down for 2-3 hours, answer all ~55 decisions across the 14 parts. Produce a single `docs/adrs/2026-04-29-system-wide-scope-decisions.md` capturing every choice. Then I write the first execution prompt (likely NestJS migration) and we start shipping.
**Path 2: Decide the top 10 and defer the rest.**
The critical decisions that unblock everything:
1. Phase 0 scope acceptance (yes/no)
2. NestJS migration approach (adapter, DTO strategy, test runner, build pipeline)
3. Template/editor fork (A, B, or C)
4. Tasks fork (TA, TB, or TC)
5. Comments fork (CA, CB, or CC)
6. File tree fork (FA, FB, or FC)
7. Collab sequencing (after Phase 0, rules-first)
8. Session state discipline (yes to current-state.md + session logs)
9. ADR discipline going forward (yes/no)
10. Your differentiation choice — which 1-2 surfaces go world-class vs professional-grade
Everything else can be decided later, as each story's sub-choices arise.
**Path 3: Stop investigating, start executing.**
Accept that the 1200-task backlog is reference material, not a contract. Pick the single most important next story (likely NestJS migration), write its full execution prompt now, ship it, then repeat. Let the decisions emerge from execution.
Path 3 is what most experienced teams do when planning has gone on long enough. The planning phase produces diminishing returns past a certain depth. The code you ship this month teaches you more than 20 more pages of investigation would.
### 14.12 My strongest recommendation
Go with **Path 2**. You've done extraordinary research. The remaining unknowns don't resolve through more investigation — they resolve through shipping.
In a single session:
1. Answer the 10 decisions above (even imperfectly)
2. File them as `docs/adrs/2026-04-29-scope-decisions.md`
3. Commit it
4. Reply here with the answers
5. I write the first execution prompt (NestJS migration) tailored to your choices
6. We ship it
7. Each Phase 0 story ends with a session log + ADR + current-state.md update
8. After Phase 0, we re-evaluate whether Forks/sub-decisions need revisiting
This is the path from 14 investigation reports to actual merged code. Everything else is preparation that compounds into paralysis if extended further.
### 14.13 Closing synthesis across all 14 parts
What we've verified across the entire investigation:
1. **Your documentation architecture is world-class on paper.** 3-tier spec/domains/agent-ref plus skill cards plus templates. Better than most funded startups.
2. **Your code quality is polished on the surface, thin underneath.** The frontend looks like Linear; the depth per surface is 20-40% of what world-class requires.
3. **Your backend has silently drifted from documented architecture.** NestJS in docs, `node:http` in code. Each story compounds the drift.
4. **Your testing is split across three runners with no coverage tool, no E2E, no real integration.** The spec describes a testing pyramid the code doesn't embody.
5. **Your CI/CD has strong PR workflow but weak observability, no IaC, no security scanning, no production environment.** Deploy pipeline exists but can't be used in anger.
6. **Your database schema is largely correct but missing 20+ tables across all the features we reviewed.** Subtasks, cycles, milestones, custom fields, reactions, attachments, permissions, files, stars, recents.
7. **Your agent rules guide correctly where they're enforced, and are ignored where they're not.** The drift is proportional to enforcement.
8. **Your session-memory discipline is manual and fragile.** Formalizing it is the single biggest pre-execution lift.
9. **Your planning approach (1200 upfront tasks) has outlived its usefulness.** Treat the task backlog as research; rebuild from story bodies + rules + current state.
10. **Your differentiation is document↔task linking + academic workflow.** Invest here deeply. Everything else is professional-grade sufficient.
The path forward is not more investigation. It's: decide the top 10, ship Phase 0 story 1, iterate. Every decision becomes easier once there's code shipping under the new foundation. Every additional week of pre-execution planning has diminishing value.
You've built more than most solo AI builders ever do. The scaffolding is here. The question is whether you can stop scaffolding and start shipping.
Say the word and I write the first execution prompt.
---
## Part 15 — Re-Evaluation: Workspace System (World-Class Standard)
### 15.1 Executive summary
**What you have today:**
- A clean four-model schema: **Workspace** + **WorkspaceMember** + **WorkspaceSettings** + **Invitation**, with workspace scoping, soft delete, partial unique indexes for active membership and single-owner enforcement
- Three **workspace types** (`professional`, `academic`, `general`) that drive defaults but share a common permission model
- Five **roles** (Owner/Admin/Manager/Member/Viewer) with well-specified capability matrix
- Three-state **lifecycle** (`active` → `archived` → `deleted` soft) with role-gated transitions and 90-day retention
- A `WorkspaceSettings.settings` JSONB with feature flags (`submissionWorkflowEnabled`, `allowViewerCommentsOnDocs`, `allowViewerCommentsOnTasks`, `allowViewerExport`) and `roleLabels` mapping
- Email-bound **invitation flow** with hashed tokens, 7-day expiry, role assignment at invite time, rate limits (30/day per workspace, 10/min per sender)
- API contract with 8 workspace endpoints, 3 membership endpoints, 4 invitation endpoints, comprehensive error code catalog
- Frontend at `apps/web/src/features/workspace/` with create wizard, settings tabs, member management, transfer-ownership dialog (per `apps/web/docs/changelog.md`)
- Workspace switcher in top nav with `Cmd+W` shortcut spec
- Workspace home dashboard, member page, settings page, archived banner
This is **the strongest system in the entire codebase.** The schema, spec, API, and feature design are all coherent and complete. It's the closest surface to "world-class on paper" — the gap to "world-class in code" is smaller here than anywhere else we've reviewed.
**What you don't have:**
- **No workspace-level audit log surface** (the schema has `AuditLog` but no UI shows workspace-specific events)
- **No member activity / last-seen** indicators on the member list (`lastAccessedAt` exists but UI usage unclear)
- **No member groups / teams** (sub-collections within a workspace)
- **No organization concept** (multiple workspaces under a parent organization)
- **No workspace branding** (no logo upload, custom colors, custom domain)
- **No workspace-level integrations** (Slack, GitHub, Google Drive)
- **No workspace-level webhooks**
- **No workspace billing / subscription** (workspace-level plan, seats, usage)
- **No SSO / SAML at workspace level** (workspace-level enterprise auth)
- **No workspace-level API keys**
- **No workspace dashboard customization** (every workspace home looks identical)
- **No quick-switch between workspaces from any context** (only via top-nav switcher)
- **No "join via link" invitations** (only email-bound; spec marks link-invites as v2)
- **No CSV bulk member import**
- **No member directory beyond the simple list** (no searching within a 200-person workspace, no sorting by role)
- **No member offboarding flow** (when a member leaves, what happens to their docs/tasks/comments?)
- **No "guest" role** (limited-time external collaborator)
- **No workspace templates beyond initial creation** (can't apply a workspace template to an existing workspace)
- **No workspace-level export** (e.g., "download all this workspace's data")
- **No workspace-level analytics dashboard** for owners (storage used, member count, document count, activity volume)
- **No workspace-level search** that cuts across docs+tasks+comments+activity
- **No "favorite workspace" / pinning**
- **No workspace-level notification preferences override**
- **No workspace-level theme / appearance**
- **No DLP / data residency controls** (where is workspace data stored?)
- **No workspace cloning** (copy structure to a new workspace)
### 15.2 What top platforms do at the workspace tier
#### Notion (Workspaces)
- **Workspace as primary container.** Each user can have multiple workspaces; switcher in top-left.
- **Plans** at workspace level (free, plus, business, enterprise) with member-count and storage limits.
- **Custom domain** (Plus+) — `myteam.notion.site`.
- **Custom logo** in sidebar.
- **Member groups** (Plus+) — admin/edit/comment/view permission groups.
- **Guests** with limited access.
- **Public homepage** option.
- **Workspace-level analytics** (Plus+) showing page views, edits, popular content.
- **API + integrations** marketplace.
- **Audit log** (Enterprise) for all workspace activity.
- **SSO / SCIM** (Enterprise).
- **Data residency** (Enterprise) — choose US / EU / etc.
#### Slack (Workspaces and Organizations)
- **Workspace = team** with channels.
- **Enterprise Grid** stitches multiple workspaces into a parent org.
- **Channels** (your "workspace" maps to this loosely).
- **Workspace settings**: name, URL, icon, default channels, retention, app permissions.
- **Member groups** (`@here`, `@channel`, custom user groups).
- **Guest accounts** with channel-scoped access.
- **SSO / SCIM**.
- **Audit logs** (Plus+).
- **Custom emoji** at workspace level.
- **Workspace-level analytics**.
- **DLP / compliance exports** (Enterprise).
#### Asana (Organizations and Teams)
- **Organization** above workspaces (works like Notion's plans).
- **Teams** within organization (sub-workspaces).
- **Per-team settings, members, projects.**
- **Guests** with project-scoped access.
- **SSO / SCIM** (Enterprise).
- **Audit log** (Enterprise).
- **Workspace branding** — custom colors, logo.
- **Public homepage** for teams.
- **Workspace-level reporting**.
#### Linear (Workspaces)
- **One workspace per company** (opinionated).
- **Teams** within a workspace (sub-collections).
- **Custom URL slug**.
- **Custom logo**.
- **GitHub / Slack / Figma integrations**.
- **API + webhooks**.
- **SSO / SCIM** (Plus).
- **Member roles**: Admin, Member, Guest.
- **Cycles, projects, initiatives** — Linear-specific structures within a workspace.
#### GitHub (Organizations)
- **Organization** as workspace.
- **Teams** within organization.
- **Repositories** within organization.
- **Custom domain** for GitHub Pages.
- **SSO / SAML** (Enterprise Cloud).
- **Audit log** (all plans).
- **Custom logo / branding**.
- **Member directory with detailed activity**.
- **Public profile** page for organization.
### 15.3 Specific gaps that hurt today
#### Member offboarding flow
Spec doesn't define what happens when a member is removed:
- Their authored documents — do they stay? Get reassigned?
- Their tasks — stay assigned to a non-member, or auto-unassigned?
- Their comments — author snapshot preserves attribution (good) but membership references are hanging
- Their pending invitations — auto-revoked?
- Their drafts / work-in-progress — lost?
Top platforms have explicit offboarding wizards: "Remove Sarah. Reassign 12 owned tasks to: ___ Reassign 3 owned documents to: ___ Delete drafts: yes/no."
#### Guest accounts
v1 has 5 roles all with full workspace access. There's no "external reviewer" or "client viewer" with limited surface visibility (e.g., only specific docs). This is a big enterprise gap.
#### Member groups / teams
A 50-person workspace has no sub-organization. Top platforms let you create "Engineering," "Design," "Product" groups within a workspace. This affects:
- Mention groups (`@engineering`)
- Permission scoping (private folders for one group)
- Notification routing
- Reporting dashboards
#### Organization layer
Most enterprise platforms have **org > workspace > content**. CollabSphere has only **workspace > content**. This blocks:
- Multi-workspace billing under a parent account
- Org-wide SSO / SAML
- Org-wide audit log
- Cross-workspace member directories
- Switching between many workspaces in different contexts
This is a v2/v3 concern, but worth noting now because the schema choice affects later cost.
#### Branding
Generic for all workspaces. No logo, no color themes, no custom domains. Cosmetic but matters for "world-class" perception.
#### Integrations
None. No GitHub link, no Slack notifications, no Google Drive embed, no Figma frames in docs. Modern collab platforms live or die on integrations.
#### Workspace-level analytics
Owners can't see "how is my workspace being used?" — total documents, tasks, comments, members, activity over time, storage usage, top contributors, etc. This is critical for paying customers.
#### Workspace search
Can search documents, tasks individually but no unified workspace search. Notion's `/` opens a search across pages, blocks, comments, files. CollabSphere's command palette likely has navigation but doesn't search content.
#### Templates beyond creation
Templates apply only at workspace creation. You can't take a template and apply it to an existing workspace ("seed me a fresh task board" or "add the standard documents folder structure"). Notion lets you do this; CollabSphere doesn't.
#### Workspace cloning
"Duplicate this workspace's structure into a new one" — useful for templating real workflows. Not specified.
### 15.4 Schema additions for world-class
```prisma
model Workspace {
  // existing fields stay
  
  // ADD
  slug           String   [@unique](https://github.com/unique) [@db](https://github.com/db).VarChar(40)
  // ^ URL slug, e.g., my-company
  
  // ADD
  logoUrl        String?  [@map](https://github.com/map)("logo_url") [@db](https://github.com/db).VarChar(500)
  // ^ workspace logo
  
  // ADD
  brandColor     String?  [@map](https://github.com/map)("brand_color") [@db](https://github.com/db).VarChar(20)
  // ^ hex color for branding accents
  
  // ADD
  customDomain   String?  [@unique](https://github.com/unique) [@map](https://github.com/map)("custom_domain") [@db](https://github.com/db).VarChar(120)
  // ^ optional custom domain for workspace homepage
  
  // ADD
  organizationId String?  [@map](https://github.com/map)("organization_id") [@db](https://github.com/db).Uuid
  // ^ optional parent organization (v2)
  
  organization   Organization? [@relation](https://github.com/relation)(fields: [organizationId], references: [id])
  groups         WorkspaceGroup[]
  integrations   WorkspaceIntegration[]
  apiKeys        WorkspaceApiKey[]
  webhooks       WorkspaceWebhook[]
}
// Optional v2: parent organization
model Organization {
  id           String    [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  name         String    [@db](https://github.com/db).VarChar(120)
  slug         String    [@unique](https://github.com/unique) [@db](https://github.com/db).VarChar(40)
  ownerId      String    [@map](https://github.com/map)("owner_id") [@db](https://github.com/db).Uuid
  plan         OrgPlan   [@default](https://github.com/default)(free)
  ssoEnabled   Boolean   [@default](https://github.com/default)(false) [@map](https://github.com/map)("sso_enabled")
  ssoProvider  String?   [@map](https://github.com/map)("sso_provider") [@db](https://github.com/db).VarChar(50)
  createdAt    DateTime  [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  workspaces   Workspace[]
  
  @@map("organizations")
}
model WorkspaceGroup {
  id           String                  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId  String                  @map("workspace_id") @db.Uuid
  name         String                  @db.VarChar(60)
  description  String?                 @db.VarChar(280)
  slug         String                  @db.VarChar(40)
  isSystem     Boolean                 @default(false) @map("is_system")
  // ^ system groups like @everyone are not user-editable
  createdById  String                  @map("created_by") @db.Uuid
  createdAt    DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)
  
  workspace    Workspace               @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  members      WorkspaceGroupMember[]
  
  @@unique([workspaceId, slug])
  @@map("workspace_groups")
}
model WorkspaceGroupMember {
  id          String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String         @map("workspace_id") @db.Uuid
  groupId     String         @map("group_id") @db.Uuid
  userId      String         @map("user_id") @db.Uuid
  addedAt     DateTime       @default(now()) @map("added_at") @db.Timestamptz(6)
  
  group       WorkspaceGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([groupId, userId])
  @@map("workspace_group_members")
}
model WorkspaceIntegration {
  id           String                       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId  String                       @map("workspace_id") @db.Uuid
  type         IntegrationType
  config       Json                         @db.JsonB
  // ^ encrypted credentials + per-integration config
  isEnabled    Boolean                      @default(true) @map("is_enabled")
  installedById String                      @map("installed_by") @db.Uuid
  installedAt  DateTime                     @default(now()) @map("installed_at") @db.Timestamptz(6)
  
  @@unique([workspaceId, type])
  @@map("workspace_integrations")
}
model WorkspaceWebhook {
  id          String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String         @map("workspace_id") @db.Uuid
  url         String         @db.VarChar(500)
  events      String[]       
  // ^ array of subscribed event names
  secret      String         @db.VarChar(120)
  isEnabled   Boolean        @default(true) @map("is_enabled")
  createdById String         @map("created_by") @db.Uuid
  createdAt   DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  
  @@map("workspace_webhooks")
}
model WorkspaceApiKey {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId String   @map("workspace_id") @db.Uuid
  name        String   @db.VarChar(100)
  keyHash     String   @unique @map("key_hash") @db.Char(64)
  scopes      String[] 
  // ^ array of scope strings: "documents:read", "tasks:write", etc.
  createdById String   @map("created_by") @db.Uuid
  lastUsedAt  DateTime? @map("last_used_at") @db.Timestamptz(6)
  expiresAt   DateTime? @map("expires_at") @db.Timestamptz(6)
  revokedAt   DateTime? @map("revoked_at") @db.Timestamptz(6)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  @@map("workspace_api_keys")
}
enum WorkspaceRole {
  OWNER
  ADMIN
  MANAGER
  MEMBER
  VIEWER
  GUEST
  // ^ NEW: limited-time external collaborator
  
  @@map("workspace_role")
}
enum OrgPlan {
  free
  starter
  business
  enterprise
  
  @@map("org_plan")
}
enum IntegrationType {
  github
  slack
  google_drive
  figma
  gitlab
  jira
  
  @@map("integration_type")
}
```
That's roughly **5 new models + 3 new enums + 5 new columns on Workspace** to support world-class workspace tier.
### 15.5 The phased plan for workspace depth
#### Tier 1 (must-have, ~3-4 weeks)
1. **Workspace slug + URL routing by slug** (`/w/my-company` instead of UUID)
2. **Logo upload** (depends on file uploads landing)
3. **Workspace branding** (logo + brand color in chrome)
4. **Member offboarding wizard** (handle reassignments, drafts, ownership)
5. **Guest role** (limited-scope external collaborators)
6. **Member directory with search + sort** for large workspaces
7. **Workspace audit log surface** (UI for AuditLog table — already in schema)
8. **Workspace-level search** (cross-doc/task/comment search)
9. **Member last-active indicator** (use existing `lastAccessedAt`)
#### Tier 2 (Linear/Asana-tier, ~4-6 weeks)
10. **Member groups** (sub-teams within workspace)
11. **Group mentions** (`@engineering` → fan-out to group members)
12. **Workspace-level analytics dashboard** for owners
13. **Workspace data export** (zip of all docs/tasks/comments)
14. **Workspace cloning** (duplicate structure to new workspace)
15. **Workspace dashboard customization** (widgets, layout)
16. **Apply template to existing workspace** (additive structure)
17. **Link invites** (not just email-bound)
#### Tier 3 (enterprise, ~6-8 weeks)
18. **Custom domains** (`myteam.collabsphere.io`)
19. **API keys** for external automation
20. **Webhooks** for outbound integration
21. **GitHub / Slack / Google Drive integrations** (the big three)
22. **Workspace-level SSO / SAML** (without org tier this is workspace-scoped)
23. **DLP / data residency controls**
#### Tier 4 (organization tier, ~4-6 weeks)
24. **Organization model** (parent of workspaces)
25. **Cross-workspace member directory at org level**
26. **Org-wide audit log**
27. **Org-wide SSO / SCIM**
28. **Org-wide billing / plans**
29. **Multiple workspaces under one organization**
Total to "world-class v1" workspace tier: ~17-24 weeks.
### 15.6 What makes the current design genuinely strong
Same shape as comments — credit where it's due:
1. **`onDelete: Restrict`** on the workspace's owner relationship — prevents user deletion from cascading-deleting their workspaces. This is correct.
2. **Single-owner partial unique index** on `workspace_members` — enforces "exactly one OWNER per workspace" at the DB layer. Most platforms enforce this only at app layer; you do it at both. Strong.
3. **Citext on `invitedEmail`** — case-insensitive email matching. Many platforms get this wrong and create duplicate invites for `Alice@Example.com` vs `alice@example.com`.
4. **Token-hash storage for invitations** with sha256 — never store plaintext tokens. Good security hygiene.
5. **`isActive` + `deletedAt` on `workspace_members`** — supports the "left and rejoined" lifecycle without losing history. Most platforms either lose the membership entirely on remove or keep stale records.
6. **Idempotent workspace creation** via `X-Idempotency-Key` — prevents duplicate workspaces from double-clicks or network retries. Few platforms do this for the workspace-create endpoint.
7. **Three-state lifecycle** with explicit transition table and 90-day soft-delete retention — clear, recoverable, prevents accidental data loss.
8. **Role label mapping per workspace type** — academic workspaces show "Supervisor / Student" instead of "Owner / Member" as cosmetic re-labels. Notion doesn't do this; you do.
9. **Workspace-scoped JSONB settings** with documented schema rather than 20 separate columns — flexible without exploding the table.
10. **Comprehensive error code catalog** — `NOT_WORKSPACE_MEMBER`, `WORKSPACE_ARCHIVED_READONLY`, `WORKSPACE_LIMIT_REACHED`, `CANNOT_REMOVE_OWNER`, `INVALID_NEW_OWNER`, `INVITATION_EXPIRED`, `EMAIL_MISMATCH`, etc. Better than most.
These are genuinely world-class design decisions. The schema is the strongest layer in the entire codebase.
### 15.7 Specific frontend gaps
You have the create wizard, settings, members page, and transfer-ownership dialog (per `apps/web/docs/changelog.md`). Missing UI elements:
- **Workspace-level search bar** (Cmd+K command palette only navigates; doesn't search content across workspace)
- **Member offboarding wizard** with reassignment dropdowns
- **Guest invitation flow** (different from member invitation)
- **Audit log viewer** (table of workspace events filterable by user/action/date)
- **Workspace analytics dashboard** for Owner/Admin (charts of activity, members, content over time)
- **Workspace integrations panel** (settings → integrations tab)
- **API keys management panel**
- **Webhooks management panel**
- **Branding settings** (logo upload, brand color picker)
- **Custom domain management**
- **Member groups management**
- **"Apply template to existing workspace" flow**
- **Workspace export download**
- **Workspace clone wizard**
The frontend is the strongest of the surfaces we've reviewed but still has 13+ missing surfaces relative to "world-class."
### 15.8 The decision you need to make for workspace
Same shape as everywhere else:
**Fork WA: Full world-class.** Tiers 1-4, ~17-24 weeks. Best workspace tier in academic/professional collaboration category.
**Fork WB: Tier 1 only (~3-4 weeks).** Slug routing, branding, offboarding, guest role, member directory, audit log, search, last-active. This brings workspaces to "Notion-tier" for a small team.
**Fork WC: Defer most.** Current workspace system is already strong. Add only the most painful gaps as they emerge: probably member offboarding wizard and audit log surface (~2 weeks combined).
**Honest recommendation: Fork WC initially, then WB once you have multi-workspace customers.** The current system is genuinely good. Member offboarding and audit log are the two most-requested workspace features in any tool past 10 members. Add those reactively rather than building Tier 1 speculatively.
The reason WC works for workspaces (vs the more aggressive forks I recommended for templates and tasks) is that the current workspace surface is already 60-70% of world-class — much further along than the other surfaces. Less catch-up needed.
### 15.9 Why the workspace surface is your strongest
Compared to templates (30% of world-class), tasks (30%), comments (60% — strong design but missing modern features), file tree (40%), the workspace tier sits at **60-70% of world-class** because:
- Schema is well-modeled with all the right invariants
- API contract is comprehensive with proper error codes
- Permission model is coherent across all surfaces (workspace_id is enforced everywhere)
- Lifecycle (active/archived/deleted) is well-thought-out with retention rules
- Invitation flow is secure (hashed tokens, email-bound, expiry, rate limits)
- Frontend is polished (create wizard, settings tabs, members page, transfer ownership)
- Documentation is comprehensive (full feature spec, user flow docs, API docs, security rules)
The workspace surface is what every other surface should look like. Use it as the reference quality bar when planning depth investments elsewhere.
### 15.10 The cumulative cost across all surfaces (updated)
Adding workspace work to the broader roadmap:
| Surface | Recommended fork | Weeks |
|---|---|---|
| Phase 0 foundations | Already discussed | 4-5 |
| Phase 1 production readiness | Already discussed | 4-6 |
| Phase 1.5 file uploads + S3 | Required | 2 |
| Editor depth (Fork B / professional) | §11.10 | 6-8 |
| Real templates | §11.10 follow-on | 2-3 |
| Diagrams + export | §11.10 follow-on | 3-4 |
| Tasks (Fork TC: 5 must-haves) | §12.10 | 3-5 |
| Tasks (Fork TB: Linear-lite) | §12.10 | 6-7 |
| Comments (Fork CB: Tier 1) | §13.7 | 3-4 |
| File tree (Fork FB: Tier 1) | §14.8 | 3-4 |
| Workspace (Fork WC: reactive) | §15.8 | 2 |
| Collab depth | §6.1 | 4-6 |
| **Cumulative ("professional" everywhere)** | | **42-56 weeks** |
That's **9.5-13 months** of focused engineering for a coherent, professional-grade v1 across all surfaces, building on solid Phase 0/1 foundations. World-class on the high-leverage surfaces (editor + tasks + the workspace differentiator: doc↔task linking + academic workflow) extends to **18-24 months** if you commit to all of it.
### 15.11 The unifying recommendation across all 15 parts
We've now investigated 15 distinct surfaces / system layers. Across all of them the pattern is the same:
| Surface | Coverage today | Reference effort to "professional" | Reference effort to "world-class" |
|---|---|---|---|
| Backend framework (NestJS) | 0% (hand-rolled) | 1-2 weeks | n/a |
| Testing | 30% | 2-3 weeks | 6-8 weeks |
| CI / Docker / Infra | 50% | 3-4 weeks | 8-12 weeks |
| Database | 70% | 1 week (seed, pool tuning, backup runbook) | 4-6 weeks (partitioning, replicas) |
| Agent rules | 80% | 1 week (gaps in Part 7) | 2-3 weeks (full skill catalog) |
| Frontend foundation | 70% | 1 week (lint, a11y, types) | 4-6 weeks (Storybook, Chromatic, perf budgets) |
| Templates / editor | 25% | 6-8 weeks | 14-19 weeks |
| Tasks | 30% | 3-5 weeks (TC) or 10-12 weeks (TB) | 25-35 weeks |
| Comments | 60% | 3-4 weeks (CB) | 8-11 weeks |
| File tree | 40% | 3-4 weeks (FB) | 10-14 weeks |
| Workspace tier | 65% | 2 weeks reactive | 17-24 weeks (Fork WA) |
| Realtime collab | 20% | 6-8 weeks (after Phase 0) | extends to 14-18 weeks |
| Observability | 0% | 2 weeks bootstrap | 6-8 weeks (full stack) |
| Production environment | 0% | 4-6 weeks | n/a (provision once) |
| Security scanning | 0% | 1-2 weeks | 4-6 weeks |
**The key insight:** your weakest surfaces (templates, tasks, file tree, realtime collab) need the most investment to reach professional-grade. Your strongest surface (workspace) needs the least. Your design-document quality vs implementation depth gap is roughly 2x — you've documented a system that's twice as deep as what's currently coded.
This is **fixable** — but only if you accept the pattern and stop adding scope. Decide what you want to be world-class at (recommend: doc↔task linking + academic workflow + collaborative editing). Make everything else professional-grade. Ship to users.
### 15.12 What I now know about your project after 15 parts of investigation
Treating this as a final synthesis:
1. **You're a serious solo builder with extraordinary planning rigor.** The doc/spec/agent-ref architecture is better than most VC-backed startups. You don't lack ambition or quality bar.
2. **You've over-invested in upfront planning relative to execution velocity.** 1200+ tasks, 18 projects, comprehensive specs — but 4 endpoints implemented and the test suite uses three different runners. The asymmetry is what's blocking you.
3. **Your AI tooling workflow is sophisticated but unsystematic.** You move between Lovable / Claude / Devin / antigravity. Each session works individually. Sessions don't compound because state is implicit. Formalizing this is the highest-leverage process change.
4. **Your code quality is uneven by surface.** Frontend is polished. Backend is hand-rolled. Tests are split. CI works but doesn't enforce coverage. Each surface tells a story about how much iteration that surface has had.
5. **Your domain model is genuinely strong.** Schema, error codes, state machines, role models — this layer is closer to world-class than any other. Don't lose this. Build features on top of this foundation.
6. **Your differentiation is doc↔task linking + academic workflows.** Not generic productivity. Not Linear. Not Notion. Pick this lane and excel; let everything else be "good enough."
7. **You're stuck because no decision has been made.** 15 investigation reports, 65+ accumulated decisions, zero new code shipped in the period of investigation. The next move isn't another report — it's decisions and execution.
### 15.13 What I recommend you do in the next 7 days
Specific, time-boxed:
**Day 1 (3-4 hours):**
- Re-read the closing synthesis of every investigation (Parts 1-15)
- Make 10 decisions: Phase 0 acceptance, NestJS approach, template fork, tasks fork, comments fork, file tree fork, workspace fork, collab timing, session memory discipline, ADR discipline
- Document them in a single ADR: `docs/adrs/2026-04-29-system-wide-scope-decisions.md`
- Commit it
**Day 2 (1 hour):**
- Write `docs/architecture/current-state.md` (template in Part 7.3)
- Commit it
**Day 3 (4-6 hours):**
- Set up `husky` pre-push hook (Part 7.7)
- Add the 5 ESLint plugin additions (Part 6.4)
- Add the 8 skill cards (Part 7.4)
- Add the rule hierarchy section to root `AGENTS.md`
- Commit each as separate PR
**Day 4-5 (8-12 hours):**
- I write the first execution prompt for NestJS migration (Phase 0 Story 1)
- You execute it with antigravity / Claude / your tool of choice
- Each commit ends with a session log entry in `docs/ai/sessions/`
- Merge after CI green + manual smoke
**Day 6-7:**
- Phase 0 Story 2 (Vitest backend migration)
- Same execution pattern
After 7 days you've broken the planning paralysis and shipped two foundational stories. The decisions document becomes a reference. The session logs become your persistent memory. Subsequent stories follow the same pattern.
### 15.14 Final word
The investigations end here unless there's a specific surface or system aspect I've missed that you want to drill into. We've now covered:
1. NestJS migration (Part 1-8 of original investigation)
2. Testing methodology (Part 9 of testing report)
3. CI / Docker / DB / Infrastructure (Part 10 of infra report)
4. Agent rules + frontend + session memory (Parts 1-8 of governance report)
5. Realtime collab (Part 9)
6. External session state (Part 10)
7. Templates + document editor (Part 11)
8. Tasks (Part 12)
9. Comments (Part 13)
10. File tree (Part 14)
11. Workspace (Part 15)
Surfaces we **haven't** investigated that you may want covered: notifications system, activity feed, search, admin console, auth/OAuth depth, billing / subscription, onboarding flow, mobile responsiveness, accessibility audit, performance audit. Each would take ~30 minutes to investigate and produce ~3-5 pages of analysis.
But I want to be honest: the marginal value of more investigation is now low. Every report past Part 8 has added detail without changing the core conclusions. The diminishing returns curve has flattened. The next thing that adds genuine project value is **decisions + execution**, not more research.
Tell me when you're ready to make decisions. Even partial answers are enough — "Phase 0 yes, NestJS approach: Express + class-validator + Vitest, Templates: Fork B, Tasks: TC, Comments: CB, File tree: FB, Workspace: WC" is enough for me to write the first execution prompt and we ship.
Until then, the investigations are complete. The codebase is comprehensively mapped. The decision space is clear. The next move is yours.
---
## Part 16 — Re-Evaluation: Academic Submission & Review System (World-Class Standard)
You're correct that this surface is **dramatically under-designed** relative to its ambition. The current spec describes a "document review workflow" — what you actually want is a **complete academic project management system with advisors, panels, evaluators, grading, milestones, and defenses**. The gap here is the largest of any surface we've reviewed.
### 16.1 Executive summary
**What you have today:**
- A `DocumentSubmission` model with submitter, snapshot version, decision (approved/changes_requested), single decider, decision note
- Three academic document statuses (`submitted`, `changes_requested`, `approved`) gated by `submissionWorkflowEnabled` flag or `academic` workspace type
- A linear state machine: Draft → Submitted → (Approved | Changes Requested) → Draft → Resubmitted → Approved
- `EditorReviewPanel` UI for the supervisor to approve / request changes with a note
- Cosmetic role-label remapping (Owner→Supervisor, Member→Student, etc.)
- Notification triggers: `document.submitted`, `document.reviewed`
- Submission history endpoint
- Activity logging
This is **a document-review feature, not an academic system.** The spec at `docs/spec/04-user-flows/04.11-academic-submission-review.md` is internally consistent for what it describes — but what it describes is roughly 10-15% of what an academic platform actually needs.
**What you don't have:**
- No concept of **advisors / co-advisors** (single Owner = supervisor; no second advisor, no co-advisor, no committee)
- No **panel / committee** of evaluators (single decider only)
- No **rubrics** (decisions are just approve/reject + free text note)
- No **grades / scores / numeric evaluation**
- No **weighted criteria** (e.g., "methodology: 30%, clarity: 20%, originality: 50%")
- No **multi-reviewer aggregation** (multiple evaluators voting / averaging / quorum)
- No **review assignments** (which advisor reviews which submission)
- No **review deadlines / SLA tracking**
- No **submission types** (proposal, milestone 1, milestone 2, final draft, defense slides)
- No **submission rounds / iterations** as first-class (counted, capped, governed)
- No **plagiarism / similarity check** integration point
- No **cohort / class / course / cycle** concept
- No **course enrollment** / batch student admission to a workspace
- No **calendar of milestones** with deadlines
- No **defense / presentation scheduling**
- No **defense rubric** distinct from document rubric
- No **peer review** (students reviewing other students' work)
- No **anonymous review** (blind to author)
- No **grade book / transcript export**
- No **grade weighting** (homework 20%, midterm 30%, final 50%)
- No **TA workflow** (delegate review, escalate to supervisor)
- No **late submission policy** (penalty %, hard cutoff, grace period)
- No **resubmission limits** (max 3 attempts, etc.)
- No **bulk feedback** (give same feedback to multiple students)
- No **office hours / meeting requests** with advisor
- No **academic calendar integration** (semester, term, week)
- No **prerequisites** (must complete proposal before milestone 1)
- No **academic integrity log** (plagiarism findings, dishonesty reports)
- No **moderation / appeal** (student disputes a grade or feedback)
- No **export final transcript / certificate** at end of project
### 16.2 What top platforms do for academic workflows
#### Canvas (LMS — Instructure)
The dominant academic platform. Notable features:
- **Courses** with **assignments**, **modules**, **discussions**, **quizzes**, **rubrics**, **gradebook**
- **Submission types**: file upload, text entry, URL, media recording, on-paper, no submission
- **Multi-attempt assignments** with attempt tracking
- **SpeedGrader** — one-page review tool with rubric, comments, grade, audio feedback
- **Peer review** with random or assigned reviewer matching
- **Anonymous grading** option
- **Group assignments** (one submission per group, grade applies to all)
- **Late policies** (deduction per day, grace period)
- **Rubric library** reusable across courses
- **Outcomes** tracking (learning objective progress)
- **Crocodoc / DocViewer** for inline annotations on PDFs
- **Turnitin integration** for plagiarism (similarity report)
- **GradeBook** with categories, weights, drop lowest, curve
- **Speedgrader navigation** (next/prev student, keyboard shortcuts)
- **Calendar** with assignment dates, exam dates, course events
- **Office hours scheduling**
#### Moodle (open-source LMS)
Similar to Canvas but more configurable:
- **Activity types**: assignment, forum, quiz, lesson, workshop (peer review), database, glossary, scorm, etc.
- **Workshop module** = full peer-review with self-assessment, calibration, anonymous review, multi-criteria
- **Competency tracking**
- **Conditional release** (must score X on prerequisite)
- **Grading scales** (numeric, letter, custom)
- **Outcomes / standards**
- **Plugin marketplace** with thousands of academic add-ons
#### Gradescope (assignment review, used at most US universities)
Specialized for assignment grading:
- **AI-assisted grading** for handwritten work
- **Rubric-first** workflow
- **Group grading** (multiple TAs grade different problems consistently)
- **Bulk grade application** ("apply '-2 points: missing units' to all matching submissions")
- **Regrade requests** with student dispute UI
- **Statistics per question** (mean, median, distribution)
- **Anonymous grading** option
- **Group submissions** (students declare partners)
#### Overleaf for theses
For document collaboration in academic context:
- **LaTeX-native** (vs your Tiptap)
- **Track changes**
- **Comment threading**
- **Reference manager integration** (Mendeley, Zotero, BibTeX)
- **Template library** for institutional thesis formats
- **Submit to journals** integration
- **Anti-plagiarism** integration (Turnitin)
#### Defense / Committee Management (specialized academic platforms)
- **Multiple advisors** per student (primary, co-advisor, committee members)
- **Committee assembly** workflow
- **Defense scheduling** with all committee members' calendars
- **Defense documents** (slides, defense form, signed sheets)
- **Defense outcomes**: pass, pass with revisions, conditional pass, fail
- **Form workflow**: each committee member signs off on outcome
- **Final approval cascade**: advisor → committee → department head → graduate school
#### What this tells us
You've designed a **lightweight document-review feature**. What you described wanting (advisors, evaluators, panels, etc.) maps to a **graduate / capstone / thesis project management system** — a category that competes with Canvas (for assignments), Trellis (for theses), and specialized university defense systems.
This is a major scope expansion. It also potentially makes CollabSphere uniquely valuable because **no platform combines Notion-style collaborative writing with Canvas-style academic workflow**. That combination is your strongest differentiation.
### 16.3 The schema gaps for true academic workflow
This is the biggest schema expansion of any surface we've reviewed. Roughly **15+ new models**.
```prisma
// Core academic structure — replaces "any workspace can be academic"
// with explicit course/program/cohort hierarchy
model AcademicProgram {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  name        String   [@db](https://github.com/db).VarChar(120)
  description String?  [@db](https://github.com/db).VarChar(500)
  type        ProgramType
  // ^ thesis | project | course | research | capstone
  startDate   DateTime [@map](https://github.com/map)("start_date") [@db](https://github.com/db).Date
  endDate     DateTime [@map](https://github.com/map)("end_date") [@db](https://github.com/db).Date
  createdAt   DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  workspace   Workspace [@relation](https://github.com/relation)(fields: [workspaceId], references: [id], onDelete: Restrict)
  cohorts     AcademicCohort[]
  milestones  AcademicMilestone[]
  
  @@map("academic_programs")
}
model AcademicCohort {
  id          String          [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  programId   String          [@map](https://github.com/map)("program_id") [@db](https://github.com/db).Uuid
  name        String          [@db](https://github.com/db).VarChar(120)
  // ^ "Fall 2026", "Cohort 12", "Section A"
  termCode    String          [@db](https://github.com/db).VarChar(20)
  startDate   DateTime        [@map](https://github.com/map)("start_date") [@db](https://github.com/db).Date
  endDate     DateTime        [@map](https://github.com/map)("end_date") [@db](https://github.com/db).Date
  
  program     AcademicProgram [@relation](https://github.com/relation)(fields: [programId], references: [id], onDelete: Cascade)
  enrollments CohortEnrollment[]
  
  @@map("academic_cohorts")
}
model CohortEnrollment {
  id          String         [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  cohortId    String         [@map](https://github.com/map)("cohort_id") [@db](https://github.com/db).Uuid
  studentId   String         [@map](https://github.com/map)("student_id") [@db](https://github.com/db).Uuid
  enrolledAt  DateTime       [@default](https://github.com/default)(now()) [@map](https://github.com/map)("enrolled_at") [@db](https://github.com/db).Timestamptz(6)
  status      EnrollmentStatus [@default](https://github.com/default)(active)
  // ^ active | withdrawn | completed | failed
  finalGrade  Decimal?       [@map](https://github.com/map)("final_grade") [@db](https://github.com/db).Decimal(5, 2)
  
  cohort      AcademicCohort [@relation](https://github.com/relation)(fields: [cohortId], references: [id], onDelete: Cascade)
  student     User           [@relation](https://github.com/relation)(fields: [studentId], references: [id], onDelete: Cascade)
  
  @@unique([cohortId, studentId])
  @@map("cohort_enrollments")
}
// Group projects: students linked to a project group
model ProjectGroup {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  cohortId    String?  [@map](https://github.com/map)("cohort_id") [@db](https://github.com/db).Uuid
  name        String   [@db](https://github.com/db).VarChar(120)
  topic       String?  [@db](https://github.com/db).VarChar(280)
  
  members     ProjectGroupMember[]
  advisors    ProjectAdvisor[]
  submissions DocumentSubmission[]
  // ^ submissions can now be group-scoped
  
  @@map("project_groups")
}
model ProjectGroupMember {
  id            String       [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  groupId       String       [@map](https://github.com/map)("group_id") [@db](https://github.com/db).Uuid
  studentId     String       [@map](https://github.com/map)("student_id") [@db](https://github.com/db).Uuid
  role          GroupRole    [@default](https://github.com/default)(member)
  // ^ leader | member
  
  group         ProjectGroup [@relation](https://github.com/relation)(fields: [groupId], references: [id], onDelete: Cascade)
  student       User         [@relation](https://github.com/relation)(fields: [studentId], references: [id], onDelete: Cascade)
  
  @@unique([groupId, studentId])
  @@map("project_group_members")
}
// Advisors: replaces single Owner-as-supervisor with multiple advisors per project
model ProjectAdvisor {
  id           String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId  String         @map("workspace_id") @db.Uuid
  groupId      String         @map("group_id") @db.Uuid
  advisorId    String         @map("advisor_id") @db.Uuid
  role         AdvisorRole    @default(primary)
  // ^ primary | co_advisor | committee_member | external_examiner
  assignedAt   DateTime       @default(now()) @map("assigned_at") @db.Timestamptz(6)
  
  group        ProjectGroup   @relation(fields: [groupId], references: [id], onDelete: Cascade)
  advisor      User           @relation(fields: [advisorId], references: [id], onDelete: Restrict)
  
  @@unique([groupId, advisorId])
  @@map("project_advisors")
}
// Milestones: ordered checkpoints with deadlines
model AcademicMilestone {
  id           String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  programId    String              @map("program_id") @db.Uuid
  name         String              @db.VarChar(120)
  description  String?             @db.Text
  position     Int
  // ^ ordering
  weight       Decimal             @default(1) @db.Decimal(5, 2)
  // ^ contribution to final grade
  dueDate      DateTime            @map("due_date") @db.Date
  submissionType SubmissionType
  // ^ document | presentation | code | mixed
  rubricId     String?             @map("rubric_id") @db.Uuid
  
  program      AcademicProgram     @relation(fields: [programId], references: [id], onDelete: Cascade)
  rubric       Rubric?             @relation(fields: [rubricId], references: [id], onDelete: SetNull)
  submissions  DocumentSubmission[]
  
  @@map("academic_milestones")
}
// Replaces simple submission with rich submission model
model DocumentSubmission {
  // existing fields stay
  
  // ADD
  milestoneId       String?         @map("milestone_id") @db.Uuid
  // ^ which milestone is this for?
  
  // ADD
  groupId           String?         @map("group_id") @db.Uuid
  // ^ for group submissions
  
  // ADD
  attemptNumber     Int             @default(1) @map("attempt_number")
  // ^ 1st, 2nd, 3rd resubmission etc.
  
  // ADD
  isLate            Boolean         @default(false) @map("is_late")
  // ^ submitted past deadline
  
  // ADD
  similarityScore   Decimal?        @map("similarity_score") @db.Decimal(5, 2)
  // ^ from plagiarism check
  
  // ADD
  similarityReportUrl String?       @map("similarity_report_url") @db.VarChar(500)
  
  milestone         AcademicMilestone? @relation(fields: [milestoneId], references: [id])
  group             ProjectGroup?      @relation(fields: [groupId], references: [id])
  reviews           SubmissionReview[]
  // ^ replace single-decider with multi-reviewer
  finalGrade        SubmissionGrade?
}
// Multiple reviewers per submission (panel/committee)
model SubmissionReview {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId     String              @map("workspace_id") @db.Uuid
  submissionId    String              @map("submission_id") @db.Uuid
  reviewerId      String              @map("reviewer_id") @db.Uuid
  reviewerRole    AdvisorRole
  decision        ReviewDecision?
  // ^ approve | request_changes | reject | abstain
  decisionNote    String?             @map("decision_note") @db.Text
  rubricScores    Json?               @map("rubric_scores") @db.JsonB
  // ^ { criterionId: score, ... } per rubric
  totalScore      Decimal?            @map("total_score") @db.Decimal(5, 2)
  isAnonymous     Boolean             @default(false) @map("is_anonymous")
  decidedAt       DateTime?           @map("decided_at") @db.Timestamptz(6)
  dueAt           DateTime?           @map("due_at") @db.Timestamptz(6)
  // ^ review SLA deadline
  
  submission      DocumentSubmission  @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  reviewer        User                @relation(fields: [reviewerId], references: [id], onDelete: Restrict)
  
  @@unique([submissionId, reviewerId])
  @@map("submission_reviews")
}
// Rubrics: reusable scoring templates
model Rubric {
  id             String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId    String           @map("workspace_id") @db.Uuid
  name           String           @db.VarChar(120)
  description    String?          @db.Text
  totalPoints    Decimal          @map("total_points") @db.Decimal(7, 2)
  scaleType      ScaleType        @default(numeric)
  // ^ numeric | letter | percentage | custom
  
  criteria       RubricCriterion[]
  milestones     AcademicMilestone[]
  
  @@map("rubrics")
}
model RubricCriterion {
  id              String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  rubricId        String           @map("rubric_id") @db.Uuid
  name            String           @db.VarChar(120)
  description     String?          @db.Text
  weight          Decimal          @db.Decimal(5, 2)
  // ^ weight in total score
  maxPoints       Decimal          @map("max_points") @db.Decimal(7, 2)
  position        Int
  levels          Json             @db.JsonB
  // ^ scoring rubric levels: [{ score: 4, label: "Excellent", description: "..." }, ...]
  
  rubric          Rubric           @relation(fields: [rubricId], references: [id], onDelete: Cascade)
  
  @@map("rubric_criteria")
}
// Final aggregated grade per submission
model SubmissionGrade {
  id              String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  submissionId    String             @unique @map("submission_id") @db.Uuid
  finalScore      Decimal            @map("final_score") @db.Decimal(5, 2)
  letterGrade     String?            @map("letter_grade") @db.VarChar(5)
  status          GradeStatus        @default(provisional)
  // ^ provisional | final | disputed | revised
  computedAt      DateTime           @default(now()) @map("computed_at") @db.Timestamptz(6)
  finalizedById   String?            @map("finalized_by") @db.Uuid
  finalizedAt     DateTime?          @map("finalized_at") @db.Timestamptz(6)
  
  submission      DocumentSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  finalizedBy     User?              @relation(fields: [finalizedById], references: [id])
  
  @@map("submission_grades")
}
// Defense / presentation scheduling
model DefenseSession {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId     String              @map("workspace_id") @db.Uuid
  groupId         String              @map("group_id") @db.Uuid
  scheduledAt     DateTime            @map("scheduled_at") @db.Timestamptz(6)
  durationMinutes Int                 @default(60) @map("duration_minutes")
  location        String?             @db.VarChar(280)
  meetingUrl      String?             @map("meeting_url") @db.VarChar(500)
  status          DefenseStatus       @default(scheduled)
  // ^ scheduled | in_progress | completed | cancelled | rescheduled
  outcome         DefenseOutcome?
  // ^ pass | pass_with_revisions | conditional_pass | fail
  notes           String?             @db.Text
  
  group           ProjectGroup        @relation(fields: [groupId], references: [id])
  attendees       DefenseAttendee[]
  
  @@map("defense_sessions")
}
model DefenseAttendee {
  id           String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  defenseId    String         @map("defense_id") @db.Uuid
  userId       String         @map("user_id") @db.Uuid
  role         AdvisorRole
  rsvpStatus   RsvpStatus     @default(pending)
  // ^ pending | accepted | declined | tentative
  
  defense      DefenseSession @relation(fields: [defenseId], references: [id], onDelete: Cascade)
  user         User           @relation(fields: [userId], references: [id])
  
  @@unique([defenseId, userId])
  @@map("defense_attendees")
}
// Plagiarism / similarity check
model SimilarityCheck {
  id            String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId   String              @map("workspace_id") @db.Uuid
  submissionId  String              @map("submission_id") @db.Uuid
  provider      String              @db.VarChar(50)
  // ^ "turnitin" | "copyleaks" | "internal"
  status        CheckStatus         @default(pending)
  similarityPct Decimal?            @map("similarity_pct") @db.Decimal(5, 2)
  reportUrl     String?             @map("report_url") @db.VarChar(500)
  flaggedItems  Json?               @map("flagged_items") @db.JsonB
  requestedAt   DateTime            @default(now()) @map("requested_at") @db.Timestamptz(6)
  completedAt   DateTime?           @map("completed_at") @db.Timestamptz(6)
  
  submission    DocumentSubmission  @relation(fields: [submissionId], references: [id])
  
  @@map("similarity_checks")
}
// Late submission policies
model LatePolicy {
  id              String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId     String           @map("workspace_id") @db.Uuid
  name            String           @db.VarChar(120)
  description     String?          @db.Text
  graceMinutes    Int              @default(0) @map("grace_minutes")
  // ^ no penalty within grace period
  perDayPenaltyPct Decimal         @default(0) @map("per_day_penalty_pct") @db.Decimal(5, 2)
  // ^ percentage off final score per day late
  hardCutoffDays  Int?             @map("hard_cutoff_days")
  // ^ refuse submissions past this many days late
  
  @@map("late_policies")
}
// Office hours / advisor availability
model AdvisorAvailability {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId  String   @map("workspace_id") @db.Uuid
  advisorId    String   @map("advisor_id") @db.Uuid
  recurrenceRule String? @map("recurrence_rule") @db.VarChar(500)
  // ^ RRULE for repeating slots
  startTime    DateTime @map("start_time") @db.Timestamptz(6)
  endTime      DateTime @map("end_time") @db.Timestamptz(6)
  
  advisor      User     @relation(fields: [advisorId], references: [id])
  
  @@map("advisor_availability")
}
// Office hours / meeting requests
model MeetingRequest {
  id              String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId     String         @map("workspace_id") @db.Uuid
  studentId       String         @map("student_id") @db.Uuid
  advisorId       String         @map("advisor_id") @db.Uuid
  topic           String         @db.VarChar(280)
  description     String?        @db.Text
  proposedSlots   Json           @map("proposed_slots") @db.JsonB
  // ^ array of proposed time slots
  selectedSlot    DateTime?      @map("selected_slot") @db.Timestamptz(6)
  status          MeetingStatus  @default(requested)
  // ^ requested | scheduled | completed | cancelled
  meetingUrl      String?        @map("meeting_url") @db.VarChar(500)
  notes           String?        @db.Text
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  
  student         User           @relation("MeetingStudent", fields: [studentId], references: [id])
  advisor         User           @relation("MeetingAdvisor", fields: [advisorId], references: [id])
  
  @@map("meeting_requests")
}
// Peer review (students reviewing each other)
model PeerReviewAssignment {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId     String              @map("workspace_id") @db.Uuid
  submissionId    String              @map("submission_id") @db.Uuid
  reviewerStudentId String            @map("reviewer_student_id") @db.Uuid
  isAnonymous     Boolean             @default(true) @map("is_anonymous")
  dueAt           DateTime            @map("due_at") @db.Timestamptz(6)
  rubricScores    Json?               @map("rubric_scores") @db.JsonB
  feedback        String?             @db.Text
  completedAt     DateTime?           @map("completed_at") @db.Timestamptz(6)
  
  submission      DocumentSubmission  @relation(fields: [submissionId], references: [id])
  reviewerStudent User                @relation(fields: [reviewerStudentId], references: [id])
  
  @@unique([submissionId, reviewerStudentId])
  @@map("peer_review_assignments")
}
// Academic integrity / dishonesty log
model AcademicIntegrityFlag {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId     String              @map("workspace_id") @db.Uuid
  submissionId    String?             @map("submission_id") @db.Uuid
  studentId       String              @map("student_id") @db.Uuid
  reportedById    String              @map("reported_by") @db.Uuid
  flagType        IntegrityFlagType
  // ^ plagiarism | collusion | unauthorized_assistance | data_fabrication | other
  severity        Severity
  // ^ minor | major | severe
  description     String              @db.Text
  evidence        Json?               @db.JsonB
  resolution      String?             @db.Text
  resolvedById    String?             @map("resolved_by") @db.Uuid
  resolvedAt      DateTime?           @map("resolved_at") @db.Timestamptz(6)
  status          IntegrityStatus     @default(open)
  // ^ open | under_review | resolved | dismissed | escalated
  createdAt       DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)
  
  @@map("academic_integrity_flags")
}
// Grade dispute / appeal
model GradeAppeal {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  workspaceId     String              @map("workspace_id") @db.Uuid
  submissionId    String              @map("submission_id") @db.Uuid
  studentId       String              @map("student_id") @db.Uuid
  reason          String              @db.Text
  status          AppealStatus        @default(submitted)
  // ^ submitted | under_review | upheld | rejected | partially_upheld
  resolution      String?             @db.Text
  reviewedById    String?             @map("reviewed_by") @db.Uuid
  reviewedAt      DateTime?           @map("reviewed_at") @db.Timestamptz(6)
  newScore        Decimal?            @map("new_score") @db.Decimal(5, 2)
  createdAt       DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)
  
  submission      DocumentSubmission  @relation(fields: [submissionId], references: [id])
  
  @@map("grade_appeals")
}
// All the new enums
enum ProgramType {
  thesis
  capstone
  research
  course_project
  dissertation
  
  @@map("program_type")
}
enum EnrollmentStatus {
  active
  withdrawn
  completed
  failed
  
  @@map("enrollment_status")
}
enum GroupRole {
  leader
  member
  
  @@map("group_role")
}
enum AdvisorRole {
  primary
  co_advisor
  committee_member
  external_examiner
  ta
  
  @@map("advisor_role")
}
enum SubmissionType {
  document
  presentation
  code
  artifact
  mixed
  
  @@map("submission_type")
}
enum ReviewDecision {
  approve
  request_changes
  reject
  abstain
  
  @@map("review_decision")
}
enum ScaleType {
  numeric
  letter
  percentage
  pass_fail
  custom
  
  @@map("scale_type")
}
enum GradeStatus {
  provisional
  final
  disputed
  revised
  
  @@map("grade_status")
}
enum DefenseStatus {
  scheduled
  in_progress
  completed
  cancelled
  rescheduled
  
  @@map("defense_status")
}
enum DefenseOutcome {
  pass
  pass_with_revisions
  conditional_pass
  fail
  
  @@map("defense_outcome")
}
enum RsvpStatus {
  pending
  accepted
  declined
  tentative
  
  @@map("rsvp_status")
}
enum CheckStatus {
  pending
  in_progress
  completed
  failed
  
  @@map("check_status")
}
enum MeetingStatus {
  requested
  scheduled
  completed
  cancelled
  
  @@map("meeting_status")
}
enum IntegrityFlagType {
  plagiarism
  collusion
  unauthorized_assistance
  data_fabrication
  other
  
  @@map("integrity_flag_type")
}
enum Severity {
  minor
  major
  severe
  
  @@map("severity")
}
enum IntegrityStatus {
  open
  under_review
  resolved
  dismissed
  escalated
  
  @@map("integrity_status")
}
enum AppealStatus {
  submitted
  under_review
  upheld
  rejected
  partially_upheld
  
  @@map("appeal_status")
}
```
That's roughly **15 new models + 13 new enums + 5 new columns on DocumentSubmission**. This is the largest schema expansion of any surface we've reviewed. Each model represents a feature class that's expected in academic systems.
### 16.4 The phased plan for academic depth
Given the scope, this needs to be broken into clear tiers — and you almost certainly should not build all of it. Pick what fits your audience.
#### Tier 1 (must-have for a real academic platform, ~6-8 weeks)
1. **Multiple advisors** (`ProjectAdvisor` table, primary + co-advisor + committee)
2. **Multi-reviewer submission** (`SubmissionReview` replaces single decider; aggregation rules)
3. **Rubrics** (`Rubric` + `RubricCriterion`, basic numeric scoring)
4. **Submission attempts / iterations** (attempt counter, history)
5. **Late submission detection** (`isLate` flag based on `dueDate` vs `submittedAt`)
6. **Project groups** (`ProjectGroup` for group submissions)
7. **Submission types beyond document** (`SubmissionType` enum: document, presentation, code, mixed)
8. **Review SLA tracking** (`dueAt` on `SubmissionReview`)
#### Tier 2 (Linear-tier academic, ~6-8 weeks)
9. **Cohorts / programs** (`AcademicProgram` + `AcademicCohort` + `CohortEnrollment`)
10. **Milestones with weights** (`AcademicMilestone`)
11. **Final grades aggregation** (`SubmissionGrade` with provisional → final lifecycle)
12. **Late policies** (`LatePolicy` with grace periods + per-day penalties)
13. **Defense scheduling** (`DefenseSession` + `DefenseAttendee`)
14. **TA workflow** (delegate/escalate review)
#### Tier 3 (Canvas-competitor, ~6-8 weeks)
15. **Plagiarism integration** (`SimilarityCheck` + Turnitin/Copyleaks API)
16. **Peer review** (`PeerReviewAssignment` with anonymous option)
17. **Office hours / meeting requests** (`AdvisorAvailability` + `MeetingRequest`)
18. **Academic integrity log** (`AcademicIntegrityFlag`)
19. **Grade appeals** (`GradeAppeal`)
20. **Calendar integration** (iCal export, Google Calendar sync)
#### Tier 4 (deferred — full LMS, 12+ weeks)
- Quiz / exam engine
- Discussion forums per cohort
- Attendance tracking
- Assignment auto-grading
- Outcome / standards tracking
- Transcript export
- Certificate generation
- LTI integration with university systems
Total to "world-class academic" v1 (Tiers 1-3): **18-24 weeks**. This is a major workstream.
### 16.5 The honest fork choices
This is the surface where the fork choice matters most because the gap is largest.
**Fork EA: Full academic platform.** Tiers 1-3, 18-24 weeks. This makes CollabSphere genuinely competitive with Canvas + specialized academic platforms for thesis/capstone work. Massive differentiation.
**Fork EB: Minimum viable academic.** Tier 1 only, 6-8 weeks. Multiple advisors, multi-reviewer submission, basic rubrics, group submissions, late detection, submission types. This brings academic features from "demo-quality document review" to "actually usable for a real thesis program."
**Fork EC: Polish the current lightweight system.** Stay with single supervisor, single decision, no rubrics. Add only:
- Submission attempts counter (~2 days)
- Document deadline + late flag (~3 days)
- Submission types beyond document (~3 days)
About 1-2 weeks. Keeps the system simple. Acknowledges this isn't your differentiation.
**Honest recommendation: Fork EB.** Here's why:
You said this in your message: *"i thought i didn't lookup this academic system and had a lot of gaps including the panels for advisors and evaluators."* That tells me **the academic surface IS your differentiation**. You care about it. You see panels and evaluators and committee structures because you've thought about real academic projects.
The current spec is a watered-down version of the real thing. Fork EC keeps it watered down. Fork EA expands beyond your bandwidth. **Fork EB hits the sweet spot:** real multiple advisors, real multi-reviewer panels, real rubrics, real groups. It transforms "academic mode" from a marketing label into a substantive feature set. Six to eight weeks of focused work.
After Fork EB ships, you can ship to academic users (universities, capstone programs, research groups), get feedback, and decide whether Tier 2/3 features (cohorts, defenses, plagiarism) are worth the next 12-16 weeks. Without users, you can't tell which Tier 2 features matter most.
### 16.6 What top platforms get wrong (your opportunity)
Worth highlighting where established academic platforms fail, because these are your opportunities:
#### Canvas / Moodle weaknesses
- **Document collaboration is terrible.** Students upload PDFs or Word docs. No real-time co-editing. CollabSphere's Tiptap+Yjs+Hocuspocus is decades ahead.
- **Comments on submissions are clunky** (separate from the document). CollabSphere has inline anchored comments natively.
- **Submission iteration is manual.** Students submit version 1, get feedback, upload version 2 — no version history, no diff. CollabSphere has built-in document versions.
- **Rubric UX is form-heavy.** Canvas SpeedGrader is fine for grading-mode but doesn't connect to the document being graded. CollabSphere can put the rubric next to the document with cross-reference to specific sections.
#### Specialized thesis platforms
- **Most are document repositories, not collaboration tools.** Students submit final PDFs. Advisors download. No real collaboration.
- **Defense scheduling is bolted on**, often a separate Calendly link.
- **Committee management is email-driven.** Most platforms don't track who's on what committee centrally.
#### Trello/Notion in academic settings
- **Notion has no submission workflow.** Academic users hack it together with status fields and Slack notifications.
- **No grading, no rubrics, no integrity logs.**
- **Easy to lose track of which version was "the one I submitted."**
CollabSphere can be the platform that combines:
- **World-class document collaboration** (Tiptap + Yjs)
- **Real academic structure** (advisors, committees, rubrics, milestones)
- **Tasks for project execution** (your existing surface)
- **Integrated comments and feedback** (inline + anchored)
This is a genuine market position. No platform does all of these well together.
### 16.7 Specific design decisions you need to make
#### Decision 16.A: Single supervisor or multiple advisors?
**Current:** Workspace Owner = supervisor (1:1).
**Recommended for Fork EB:** Add `ProjectAdvisor` table with roles (primary, co-advisor, committee, external examiner). The Owner role stays admin-of-workspace; advisors are project-scoped.
#### Decision 16.B: Project group as separate entity, or workspace = project?
**Current:** Workspace is the project boundary. One workspace per project, students invited as Members.
**Recommended for Fork EB:** Add `ProjectGroup` for explicit group projects. A workspace can host one program with many groups; each group has its own advisors, milestones, submissions. This scales to "Senior Project Spring 2026" workspace with 20 groups.
#### Decision 16.C: Single decision or multi-reviewer aggregation?
**Current:** One `decidedBy` field. Single decider.
**Recommended for Fork EB:** `SubmissionReview` per reviewer. Aggregation rules:
- All advisors must approve → status = approved
- Any advisor requests changes → status = changes_requested
- Quorum option: 2/3 approve → approved (configurable per workspace)
#### Decision 16.D: Numeric rubric or holistic feedback?
**Current:** Free-text decision note.
**Recommended for Fork EB:** Both. Rubric optional per milestone. Without rubric, holistic feedback works. With rubric, scoring + feedback per criterion.
#### Decision 16.E: Group submissions or individual?
**Current:** Individual.
**Recommended for Fork EB:** Both. Submission has optional `groupId`. Individual = `groupId NULL`. Group = `groupId` set. Grade applies to all group members, with per-member adjustment optional.
#### Decision 16.F: Late submission policy?
**Current:** Not modeled.
**Recommended for Fork EB:** Add `LatePolicy` to workspace settings with grace + per-day penalty. Submission gets `isLate` flag computed at submit time. Penalty applied at grade computation.
#### Decision 16.G: Submission types beyond documents?
**Current:** Submission means document.
**Recommended for Fork EB:** Add `SubmissionType` enum. Document submissions stay as today. Presentation submissions allow file upload + slot scheduling. Code submissions allow Git URL or zip upload. Mixed allows multiple artifacts.
### 16.8 The frontend surface gaps
The frontend currently has `EditorReviewPanel` for the supervisor view. To support Fork EB, you'll need:
#### New UI surfaces
1. **Advisor management page** per group/project (add/remove advisors, assign roles)
2. **Multi-reviewer submission detail** showing each reviewer's status, score, feedback
3. **Rubric scoring UI** for reviewers (slider/dropdown per criterion + comment)
4. **Group composition page** (members + roles within group)
5. **Group submission flow** (any group member can submit; all see status)
6. **Late submission warning** at submit time
7. **Submission type selector** at submit time
8. **Aggregated submission status badge** (3 of 5 advisors approved)
9. **Rubric library** (admin/owner manages reusable rubrics)
10. **Committee dashboard** for advisors to see all their assigned reviews
11. **Review queue with deadlines** (sorted by due date, color-coded by SLA)
#### Tier 2 surfaces (if you continue past Fork EB)
12. **Cohort dashboard** (all students/groups in this cohort)
13. **Milestone calendar** (timeline of upcoming deadlines)
14. **Final grades dashboard** (per-cohort grade distribution, exportable)
15. **Defense scheduling calendar** (with availability matching)
16. **Defense outcome form** (pass/fail with revision conditions)
#### Tier 3 surfaces
17. **Plagiarism report viewer** (similarity findings inline in document)
18. **Peer review assignment dashboard** (random assignment, anonymous review UI)
19. **Office hours scheduling** (advisor availability slots, student booking)
20. **Academic integrity case management** (flag, investigate, resolve)
21. **Grade appeal flow** (student-initiated, reviewer assignment, outcome)
The frontend cost of Fork EB is roughly **3-4 weeks of UI work** beyond the schema/API. Tier 2 adds **2-3 weeks**. Tier 3 adds **3-4 weeks**.
### 16.9 The connection to templates (you specifically asked)
You mentioned this might connect to templates. It does, deeply:
**Academic templates need to specify rubrics.** A "Senior Project" template should ship with:
- Pre-defined milestones (Proposal, Mid-progress, Final Report, Defense)
- Pre-defined rubric for each milestone
- Pre-defined late policy
- Pre-defined committee structure (1 primary advisor + 2 committee members)
- Pre-defined document templates (RAD, SRS, Final Report) for each milestone
**Schema implication:** `WorkspaceTemplate.content` JSONB needs to include:
```json
{
  "academicProgram": {
    "type": "capstone",
    "milestones": [
      {
        "key": "proposal",
        "name": "Project Proposal",
        "weight": 0.10,
        "dueOffsetDays": 14,
        "rubricRef": "rubric_proposal_v1",
        "documentTemplateId": "tpl_doc_academic_proposal_v1",
        "submissionType": "document"
      },
      {
        "key": "midprogress",
        "name": "Mid-Progress Report",
        "weight": 0.20,
        "dueOffsetDays": 60,
        "rubricRef": "rubric_midprogress_v1",
        "documentTemplateId": "tpl_doc_academic_midprogress_v1"
      }
      // ... more milestones
    ],
    "defaultLatePolicy": {
      "graceMinutes": 60,
      "perDayPenaltyPct": 5,
      "hardCutoffDays": 7
    },
    "committeeStructure": {
      "primary": 1,
      "co_advisor": 0,
      "committee_member": 2,
      "external_examiner": 0
    }
  }
}
```
This means: **academic templates are deeper than other templates**. They configure not just folder structure and document content, but also rubrics, milestones, committee shape, and policies.
This is a meaningful design lift, but it's what makes "Senior Project Spring 2026" template actually useful — apply it once and the whole semester's structure is set up.
### 16.10 What strong academic platforms always have
Beyond features, certain qualities define academic-grade software:
1. **Audit trail for everything.** Who graded what when, what was changed, who approved. Required for academic integrity disputes years later.
2. **Snapshot immutability.** When student submits, that exact version is preserved forever. No retroactive edits. Your `snapshotVersionId` already does this — strong.
3. **FERPA / GDPR compliance for student data.** Specific data handling rules (US: FERPA; EU: GDPR; many universities have additional). Worth at least a security review.
4. **Anonymization options.** Some institutions require anonymous grading. Schema needs to support hiding student identity from reviewers.
5. **Rollback windows.** Grades can be revised within N weeks of submission, then locked. Disputes after that go through formal appeal.
6. **Notification reliability.** Missed submission notification = student misses deadline. Academic platforms over-notify on purpose.
7. **Calendar integration.** Defense schedules, milestone dates flow into Google Calendar / iCal so they're visible alongside other commitments.
8. **Email gateways.** Many academic users live in email. Reply-to-comment, email-as-submission. Your platform doesn't have inbound email yet.
9. **Print / PDF artifacts.** Final theses get printed, signed, archived. Need clean PDF export with proper formatting.
10. **Year-over-year archive.** A 2024 cohort's data needs to be findable in 2027. Soft-delete + retention is fine; surface it.
These are the table-stakes that distinguish "we have submissions" from "we run actual academic programs."
### 16.11 The cumulative roadmap (updated with academic)
| Surface | Recommended fork | Weeks |
|---|---|---|
| Phase 0 foundations | Already discussed | 4-5 |
| Phase 1 production readiness | Already discussed | 4-6 |
| Phase 1.5 file uploads + S3 | Required | 2 |
| Editor depth (Fork B / professional) | §11.10 | 6-8 |
| Real templates | §11.10 follow-on | 2-3 |
| Diagrams + export | §11.10 follow-on | 3-4 |
| Tasks (Fork TC: 5 must-haves) | §12.10 | 3-5 |
| Tasks (Fork TB: Linear-lite) | §12.10 | 6-7 |
| Comments (Fork CB: Tier 1) | §13.7 | 3-4 |
| File tree (Fork FB: Tier 1) | §14.8 | 3-4 |
| Workspace (Fork WC: reactive) | §15.8 | 2 |
| Collab depth | §6.1 | 4-6 |
| **Academic (Fork EB: minimum viable)** | **§16.5** | **6-8** |
| **Cumulative ("professional" everywhere)** | | **48-65 weeks** |
That's now **11-15 months** of focused engineering for a coherent v1 across all surfaces, including a properly-scoped academic system. World-class everywhere extends to 22-30 months.
### 16.12 The strategic implication
Adding the academic surface as Fork EB changes the project's identity slightly:
**Before:** "Notion-tier collaboration platform with academic mode flag."
**After Fork EB:** "Academic project management platform with world-class collaborative writing."
These positions sound similar but are commercially very different:
- The first competes with Notion, Coda, Confluence — crowded market, weak differentiation, hard to charge for.
- The second competes with Canvas (for capstone-specific features), specialized thesis tools, and university-internal homegrown systems. Smaller market but **less competition, clearer paying customer (universities), defensible moat (writing experience + academic structure together).**
If academic is genuinely your differentiation — and your investigation reaction ("i had a lot of gaps") suggests it is — then Fork EB isn't a feature, it's a strategic positioning move.
### 16.13 The unifying recommendation across surfaces (revised)
Your differentiation strategy is now clearer:
**Be world-class at:**
1. **Document↔task linking** (already designed, your most distinctive feature)
2. **Academic project management** (Fork EB scope: advisors, committees, rubrics, groups, milestones)
3. **Collaborative writing** (Tiptap+Yjs+Hocuspocus is already best-in-class)
**Be professional-grade at:**
4. Workspace tier (already 65% there, Fork WC reactive maintenance)
5. Tasks (Fork TC: 5 must-haves, Fork TB if customers demand)
6. Comments (Fork CB: Tier 1)
7. File tree (Fork FB: Tier 1)
8. Templates (Fork B / professional)
**Be functional but minimal at:**
9. Notifications, activity feed, search, admin console — not yet investigated, but the same fork pattern applies.
**Skip entirely:**
10. Built-in chat, video calls, AI features — not your differentiation, would distract from the academic-writing identity.
This narrows the project. CollabSphere is **the platform where academic teams write and ship together** — not a general productivity tool. Specific. Defensible. Marketable.
### 16.14 The concrete summary (academic surface)
**Schema additions for Fork EB (minimum viable academic):**
- `ProjectAdvisor` (multiple advisors per project, role-typed)
- `SubmissionReview` (per-reviewer review records, replaces single decider)
- `Rubric` + `RubricCriterion` (reusable scoring templates)
- `ProjectGroup` + `ProjectGroupMember` (group submissions)
- `LatePolicy` (workspace-level penalty rules)
- New columns on `DocumentSubmission`: `attemptNumber`, `isLate`, `groupId`, `milestoneId` (forward-compat for Tier 2)
- New enums: `AdvisorRole`, `ReviewDecision`, `SubmissionType`, `GroupRole`
**API additions for Fork EB:**
- `POST/GET/PATCH/DELETE /workspaces/:wid/projects/:pid/advisors`
- `POST /workspaces/:wid/documents/:did/submissions/:sid/reviews` (multi-reviewer)
- `POST/GET /workspaces/:wid/rubrics`
- `POST/GET /workspaces/:wid/groups`
- Updates to `submit` endpoint to detect lateness and accept submission type
**Frontend for Fork EB:**
- Multi-reviewer panel (extend `EditorReviewPanel` or replace)
- Rubric scoring UI
- Group composition page
- Advisor management page
- Late submission warning at submit
- Submission type picker
**Estimated effort: 6-8 weeks**, roughly:
- Schema migration + tests: 1 week
- API endpoints + tests: 2 weeks
- Frontend surfaces: 3-4 weeks
- Integration + manual smoke: 1 week
### 16.15 What I need from you to write the academic execution prompt
Same shape as every other surface:
1. **Pick a fork: EA, EB, or EC.** My strong recommendation is EB.
2. **Confirm priority order:** does academic Fork EB happen before or after editor depth (Fork B)? Before or after tasks Fork TB?
3. **Decide design choices 16.A-16.G** (multiple advisors, project groups, multi-reviewer aggregation, rubric optionality, group submissions, late policy, submission types).
4. **Confirm template integration:** are academic templates allowed to ship rubrics + milestones + committee structure (vs only document content)?
5. **Confirm whether Tier 2 features are deferred or part of the same arc.**
Once those five are answered, I write the academic execution prompt the same way I wrote the verify-email round prompts.
### 16.16 Closing the academic re-evaluation
The academic surface was the most under-designed of any surface we've reviewed. It also might be your strongest differentiation. The current spec describes a 10-15% slice of what real academic project management requires; Fork EB doubles that to a useful 25-30% slice; Fork EA reaches 70-80% of what Canvas provides for capstone/thesis use.
You don't need to be Canvas. You need to be **the platform where a 20-person capstone class can write thesis chapters together while their advisors give structured feedback**. That's Fork EB. Six to eight weeks of focused work.
This concludes Part 16 — the academic system re-evaluation. We've now investigated 16 distinct surfaces / system layers. The accumulated decision matrix is now around **75 choices**, clustered around 11 critical ones (the 10 from Part 14 plus academic fork EB).
After this, the most-likely surfaces still to investigate (if you want) are:
- Notifications system (in-app + email)
- Activity feed
- Search system
- Admin console
- Auth depth (OAuth, SSO, SAML, password policies, MFA)
- Billing / subscription / plans
- Onboarding flow
- Mobile responsiveness audit
- Accessibility audit
- Performance audit
But the same caveat from Part 15 applies: **the marginal value of more investigation is now low.** Each additional report adds detail without changing the strategic conclusions. The next thing that adds genuine project value is decisions and execution — not more reports.
Whenever you're ready, tell me which decisions you've made (academic fork + the 10 prior critical decisions) and I'll write the first execution prompt. Or if you want one more surface investigated first, point me at it.
Otherwise, the picture is now complete: 16 parts, ~75 decisions, a clear differentiation strategy, and a phased path from Phase 0 foundations through 11-15 months of feature work to a coherent professional/world-class hybrid v1 with academic project management as the standout surface.
---
## Part 17 — Re-Evaluation: Professional Workspace, Files, and Analytics
This part covers three surfaces in one document. Each is shorter than the previous re-evaluations because the gaps and recommendations cluster around the same patterns we've now seen 16 times.
---
### 17.A Professional Workspace Mode
#### 17.A.1 Executive summary
**What you have today:**
- Workspace `type` enum: `professional | academic | general` (DB-level)
- Cosmetic role label remapping (Owner→Owner, Admin→Admin, Manager→Tech Lead, Member→Developer, Viewer→Stakeholder)
- Default workspace template "Software Development Project" creates folders (Product / Architecture / Engineering / Meetings / Releases) and task board columns (Backlog / Sprint / In Progress / Review / Done)
- `submissionWorkflowEnabled = false` by default for professional type
- Identical permission system across workspace types
**What you don't have:**
- **No real sprint mechanics** — "Sprint" is just a column name on the task board, not a Cycle/Iteration model with start/end dates, scope freeze, velocity, burndown
- **No story points / estimates** as first-class fields
- **No retrospective workflow** (template document only)
- **No standups** (daily check-in surface)
- **No release / deployment tracking**
- **No bug-tracking specifics** (severity, reproduction steps, environment fields)
- **No GitHub integration** (commit linking, PR status, CI status)
- **No Slack integration** (channel notifications, slash commands)
- **No Figma / design tool embeds**
- **No incident management** (postmortem template exists; incident lifecycle doesn't)
- **No Jira-style epic > story > subtask hierarchy** (already noted in tasks re-evaluation)
- **No engineering metrics** (DORA, lead time, deployment frequency, change failure rate)
- **No on-call schedules / paging integration**
- **No code review surfaces** (no diff view, no inline code comments)
- **No spec / RFC governance** beyond a template document
- **No release notes generator** from merged PRs / closed tasks
- **No team velocity tracking** despite spec mentioning "velocity tracking" as a feature
#### 17.A.2 The honest assessment
**Professional mode in v1 is essentially: "academic mode is off + dev-themed templates + dev-themed task columns."** That's it. The spec lists impressive-sounding features ("sprint boards, dev templates, velocity tracking") but in code, "sprint" is a column name and "velocity tracking" is unimplemented.
This is the **least differentiated workspace mode**. Academic mode at least has the submission workflow backbone (even if minimal). Professional mode has no backbone — it's labels and templates.
#### 17.A.3 What top platforms do for professional/engineering mode
- **Linear**: Cycles (1-2 week sprints) with auto-rollover, velocity tracking, scope freeze, projects spanning multiple cycles, GitHub PR/issue sync, Slack notifications, Cmd+K everywhere.
- **Jira**: Sprints with explicit start/end, capacity planning per assignee, burndown charts, velocity reports per team, issue types (bug, story, epic, task) with separate workflows, JQL queries.
- **GitHub Projects**: Issues are first-class, projects roll up, custom fields per project, automatic state transitions on PR merge/close, deep CI integration.
- **Asana for engineering**: Custom fields, dependencies with critical path, portfolios across teams, workload view per assignee, time tracking.
- **Height / Shortcut**: Modern Linear-likes with sprints, milestones, GitHub sync.
The minimum to be **competent** in professional mode requires:
1. Cycles / sprints with start/end dates
2. Story points or hour estimates
3. Velocity computation (planned vs delivered per cycle)
4. GitHub link (issue ↔ PR/commit reference)
5. Burndown / velocity charts in analytics
Most of these are already in the **Tasks Tier 2 (Fork TB)** scope from §12.5. So you don't actually need a separate "professional mode" build — you need to ship Fork TB, which is already on the roadmap.
#### 17.A.4 The schema gaps for real professional mode
Beyond what's already in the Tasks re-evaluation (Cycle, Milestone, TaskDependency, custom fields, estimates), professional mode benefits from:
```prisma
model GithubLink {
  id            String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  taskId        String?  [@map](https://github.com/map)("task_id") [@db](https://github.com/db).Uuid
  documentId    String?  [@map](https://github.com/map)("document_id") [@db](https://github.com/db).Uuid
  repoSlug      String   [@map](https://github.com/map)("repo_slug") [@db](https://github.com/db).VarChar(120)
  // ^ "owner/repo"
  refType       GithubRefType
  // ^ pull_request | issue | commit | branch
  refNumber     String?  [@map](https://github.com/map)("ref_number") [@db](https://github.com/db).VarChar(40)
  refUrl        String   [@map](https://github.com/map)("ref_url") [@db](https://github.com/db).VarChar(500)
  status        String?  [@db](https://github.com/db).VarChar(40)
  // ^ open | merged | closed | etc.
  createdAt     DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  @@map("github_links")
}
model Release {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  version     String   [@db](https://github.com/db).VarChar(40)
  // ^ semver or freeform
  releasedAt  DateTime? [@map](https://github.com/map)("released_at") [@db](https://github.com/db).Timestamptz(6)
  notes       String?  [@db](https://github.com/db).Text
  status      ReleaseStatus [@default](https://github.com/default)(planned)
  // ^ planned | in_progress | released | rolled_back
  
  @@map("releases")
}
model Incident {
  id            String          [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String          [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  title         String          [@db](https://github.com/db).VarChar(200)
  severity      IncidentSeverity
  // ^ sev1 | sev2 | sev3 | sev4
  status        IncidentStatus  [@default](https://github.com/default)(open)
  // ^ open | investigating | mitigated | resolved | postmortem
  startedAt     DateTime        [@map](https://github.com/map)("started_at") [@db](https://github.com/db).Timestamptz(6)
  resolvedAt    DateTime?       [@map](https://github.com/map)("resolved_at") [@db](https://github.com/db).Timestamptz(6)
  postmortemDocId String?       [@map](https://github.com/map)("postmortem_doc_id") [@db](https://github.com/db).Uuid
  
  postmortem    Document?       [@relation](https://github.com/relation)(fields: [postmortemDocId], references: [id])
  
  @@map("incidents")
}
enum GithubRefType {
  pull_request
  issue
  commit
  branch
  
  @@map("github_ref_type")
}
enum ReleaseStatus {
  planned
  in_progress
  released
  rolled_back
  
  @@map("release_status")
}
enum IncidentSeverity {
  sev1
  sev2
  sev3
  sev4
  
  @@map("incident_severity")
}
enum IncidentStatus {
  open
  investigating
  mitigated
  resolved
  postmortem
  
  @@map("incident_status")
}
```
That's 3 new models + 4 new enums for a meaningful professional mode beyond Tasks Tier 2.
#### 17.A.5 The fork choice for professional mode
**Fork PA: Real engineering platform** — Tasks Tier 2 (Fork TB) + GitHub integration + releases + incidents. **~10-14 weeks** combined.
**Fork PB: Tasks Tier 2 only (Linear-lite)** — Cycles, milestones, estimates, dependencies. **6-7 weeks**. Defer engineering-specific extras (GitHub, releases, incidents). Most teams accept this as "good enough."
**Fork PC: Defer entirely** — Keep professional mode as labels + templates. Acknowledge it's not differentiated. Focus all energy on the academic surface (your real differentiation per Part 16).
**Honest recommendation: Fork PC.** Here's why:
You said the academic surface is your real differentiation (Part 16). You can't be best-in-class at both academic project management AND software-team workflow. Linear has 50+ engineers building the second; you'll never beat them.
Professional mode in v1 is fine as "academic features off + dev templates." Ship Tasks Fork TB (separately) for general task power-ups that benefit all workspace types. Skip GitHub/Slack/Figma integrations until customers explicitly demand them.
If a paying engineering team ever shows up and says "we need GitHub sync," reconsider. Until then, Fork PC.
---
### 17.B Files & Attachments
#### 17.B.1 Executive summary
**What you have today (per spec):**
- `File` model: workspace-scoped, S3 storage, lifecycle states (`pending|uploaded|ready|failed|deleted`), MIME type, size, optional checksum, optional metadata JSONB
- `Attachment` model: polymorphic links to documents/tasks/comments
- `ExportJob` model: tracks PDF/Markdown export requests with output file pointer
- Spec for size limits (25MB single file, 5GB workspace, 10k files), MIME allowlist (PDF, txt, MD, DOCX, PPTX, XLSX, PNG, JPEG, ZIP optional, JSON, CSV)
- Spec for `/w/:workspaceId/files` page with list/grid view, drag-drop upload, filters, attachment UI on tasks/documents
- Storage on S3 with workspace-scoped paths, unguessable storage keys
**What you don't have:**
- **The actual code.** The schema is referenced in the spec but the audit shows the Prisma schema's `File` and `Attachment` models are **truncated/missing from the visible schema** — meaning they may not be implemented yet
- **No file upload UI** in the current frontend (the spec exists but no `apps/web/src/features/files/` was confirmed in any prior investigation; the spec said "v1.1 recommended" for the Files Library)
- **No virus scanning** (called out as future extensibility goal, not v1)
- **No file versioning** (replace a file with a new version, keep history)
- **No image thumbnails / previews** (PDF preview, image lightbox, video player)
- **No file deduplication** (same file uploaded twice = 2x storage)
- **No file expiry / TTL** (auto-delete unused files after N days)
- **No file sharing outside workspace** (signed URLs with TTL for external sharing)
- **No file folders** (separate from document folders — files live flat or attach to entities only)
- **No file tags / metadata search** beyond filename
- **No file version restore** (after replacing version 2 with 3, no way to revert to 2)
- **No upload resume** for large files / poor connections
- **No client-side encryption** (sensitive workspaces want client-encrypted files)
- **No CDN integration** (S3 direct = slow downloads from far regions)
- **No bandwidth / storage analytics per workspace** (usage tracking)
- **No file lock / locked-by indicator** (someone else is editing this PDF)
- **No collaborative file annotation** (PDF markup, image annotation)
- **No file comments separate from attachment comments**
#### 17.B.2 What top platforms do
- **Google Drive**: Folders, sharing controls, version history, real-time collaboration on Google Docs/Sheets/Slides, image/PDF viewer, search by content (OCR), 15GB free / paid tiers
- **Dropbox**: Smart sync (download on demand), version history, file requests (external upload), Dropbox Paper integration, large-file streaming, dropbox transfer (signed URL with expiry)
- **Notion files**: Inline embedded files in pages, image gallery view, file cards, no separate file library
- **Confluence attachments**: Per-page attachments with version history, attachment management page per space, inline previews
- **Slack files**: Drop in chat, threaded comments per file, search by file type, share to other channels, retention policies
- **GitHub LFS**: Large file storage with versioning, deduplication, bandwidth quotas
- **Linear files**: Drop in issue / comment, simple inline preview, no separate library
The minimum to be **competent** for a collaboration platform is:
1. Upload via drag-drop and picker
2. Attach to documents, tasks, comments
3. Download via signed URL with TTL
4. Inline preview for images and PDFs
5. Workspace storage quota with clear UX when reached
6. Soft-delete with restore window
You have all 6 of these in spec. None confirmed in code.
#### 17.B.3 The honest assessment
The Files surface is **the most spec-rich, code-poor surface** of anything we've reviewed. The data model is well-designed, the storage strategy is sound (S3, signed URLs, workspace-scoped paths, unguessable keys), the permission model is clear. But the implementation appears to be **0%** — no upload code, no Files page, no virus scanning, no preview generation, no thumbnail pipeline.
This is not a critique — files were always P1.5/P2 in your roadmap. It's a status update: when you're ready to build files, you have a complete blueprint to execute against. There's no design work needed; just implementation.
#### 17.B.4 The schema additions for a stronger files system
Beyond what's already specified:
```prisma
// Add to existing File model:
model File {
  // existing fields stay
  
  // ADD
  parentFileId    String?  [@map](https://github.com/map)("parent_file_id") [@db](https://github.com/db).Uuid
  // ^ for versioning: each version is a row pointing to original
  
  versionNumber   Int      [@default](https://github.com/default)(1) [@map](https://github.com/map)("version_number")
  
  thumbnailKey    String?  [@map](https://github.com/map)("thumbnail_key") [@db](https://github.com/db).VarChar(500)
  // ^ S3 key for generated thumbnail
  
  previewKey      String?  [@map](https://github.com/map)("preview_key") [@db](https://github.com/db).VarChar(500)
  // ^ S3 key for generated preview (PDF render, scaled image, etc.)
  
  scanStatus      ScanStatus  [@default](https://github.com/default)(pending) [@map](https://github.com/map)("scan_status")
  // ^ pending | clean | infected | failed
  
  scanProvider    String?  [@map](https://github.com/map)("scan_provider") [@db](https://github.com/db).VarChar(40)
  scanResult      Json?    [@map](https://github.com/map)("scan_result") [@db](https://github.com/db).JsonB
  
  expiresAt       DateTime? [@map](https://github.com/map)("expires_at") [@db](https://github.com/db).Timestamptz(6)
  // ^ optional TTL for ephemeral files
  
  parentFile      File?    [@relation](https://github.com/relation)("FileVersions", fields: [parentFileId], references: [id])
  versions        File[]   [@relation](https://github.com/relation)("FileVersions")
  shares          FileShare[]
  comments        FileComment[]
}
model FileShare {
  id            String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  fileId        String   [@map](https://github.com/map)("file_id") [@db](https://github.com/db).Uuid
  tokenHash     String   [@unique](https://github.com/unique) [@map](https://github.com/map)("token_hash") [@db](https://github.com/db).Char(64)
  createdById   String   [@map](https://github.com/map)("created_by") [@db](https://github.com/db).Uuid
  expiresAt     DateTime [@map](https://github.com/map)("expires_at") [@db](https://github.com/db).Timestamptz(6)
  passwordHash  String?  [@map](https://github.com/map)("password_hash") [@db](https://github.com/db).Char(64)
  // ^ optional password protection
  downloadCount Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("download_count")
  maxDownloads  Int?     [@map](https://github.com/map)("max_downloads")
  // ^ optional download limit
  revokedAt     DateTime? [@map](https://github.com/map)("revoked_at") [@db](https://github.com/db).Timestamptz(6)
  
  file          File     [@relation](https://github.com/relation)(fields: [fileId], references: [id], onDelete: Cascade)
  
  @@map("file_shares")
}
model FileComment {
  id          String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  fileId      String   [@map](https://github.com/map)("file_id") [@db](https://github.com/db).Uuid
  authorId    String?  [@map](https://github.com/map)("author_id") [@db](https://github.com/db).Uuid
  content     Json     [@db](https://github.com/db).JsonB
  // ^ Tiptap JSON
  pageNumber  Int?     [@map](https://github.com/map)("page_number")
  // ^ for PDF page-anchored comments
  position    Json?    [@db](https://github.com/db).JsonB
  // ^ optional spatial anchor (x/y for image annotations)
  createdAt   DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  file        File     [@relation](https://github.com/relation)(fields: [fileId], references: [id], onDelete: Cascade)
  
  @@map("file_comments")
}
enum ScanStatus {
  pending
  scanning
  clean
  infected
  failed
  
  @@map("scan_status")
}
```
3 additions: file versioning (parentFileId + versionNumber), file shares (external sharing), file comments (per-file annotation/commenting). Plus virus scanning and TTL fields.
#### 17.B.5 The phased plan for files
**Phase F0 (foundation, ~2-3 weeks):**
- Implement `File` and `Attachment` per existing spec
- S3 upload via signed PUT URLs
- File metadata API
- Permission checks based on attachment target
**Phase F1 (basic UX, ~2-3 weeks):**
- Files page at `/w/:workspaceId/files`
- Drag-drop upload with progress
- Inline image and PDF preview
- Attachment chips on tasks/documents/comments
- Workspace storage quota with UX warning
**Phase F2 (production hardening, ~2 weeks):**
- Virus scanning via worker job (ClamAV or commercial API)
- Thumbnail generation for images, PDF page 1
- File versioning (replace, view history, restore)
- Soft-delete with restore window
- Storage analytics (per user, per type)
**Phase F3 (advanced, ~3-4 weeks):**
- File shares (signed URLs with TTL, password, download limit)
- File comments and PDF annotation
- File search across workspace
- Image gallery view
- File folders separate from document folders
**Total to "professional grade" files:** Phase F0 + F1 + F2 = **6-8 weeks**.
#### 17.B.6 The fork choice for files
**Fork FA: All four phases (~12-15 weeks).** Best-in-class file collab.
**Fork FB: Phases F0 + F1 only (~5-6 weeks).** Functional uploads, attachments, library, basic preview. No virus scan, no versioning, no shares. Most teams ship at this depth.
**Fork FC: Phase F0 only (~2-3 weeks).** Backend only, no UI. Other features attach files via API; no Files library page. Useful as a backend pre-requisite for editor's image-block work.
**Honest recommendation:**
- If file uploads are a Phase 1.5 dependency (image blocks in editor, attachments on tasks), do **Fork FB**.
- If only the editor's image block needs files, **Fork FC** is enough; no Files library page needed.
- Defer Phase F2 (virus scan) until you have paying customers in regulated environments.
---
### 17.C Analytics
#### 17.C.1 Executive summary
**What you have today (verified built, not just spec'd):**
This is the **first surface where the frontend implementation matches or exceeds the spec.** The Analytics page exists at `apps/web/src/features/analytics/pages/Analytics.tsx` with:
- Manager+ permission gate (`canViewAnalytics`)
- Top-level KPIs (4 max, calm rather than chart-spam)
- Task throughput chart (4-week created vs completed)
- Activity trend sparkline (7-day events)
- Document progress (status distribution: draft/submitted/changes_requested/approved/archived)
- Member contribution table (docs authored, tasks completed, comments left, last active)
- **Conditional academic block** for academic workspaces showing pending reviews, average review turnaround, overdue submissions
This is genuinely thoughtful design. The phrase "calm read on workspace health, not chart spam" in the page header reflects clear design intent. The data shape via `mock-analytics.ts` is well-modeled.
**What you don't have:**
- **No real backend** — `fetchAnalyticsSnapshot()` returns mock data. When backend lands, this becomes real queries.
- **No date-range picker** — currently fixed to last 4 weeks / last 7 days; users can't change ranges
- **No export to CSV/PDF** — managers can't share findings outside the platform
- **No comparison periods** ("this week vs last week") — only point-in-time snapshots
- **No drill-down** — click a metric and see the underlying records (e.g., "show me the 12 overdue submissions")
- **No saved views / dashboards** — every load shows the same default
- **No custom KPIs** — the 4 KPIs are hardcoded; admins can't pick which 4 matter
- **No alerts / thresholds** — no notification when "overdue submissions > 5"
- **No member-level deep-dive** — can't click a member to see their full activity timeline
- **No team-level grouping** for workspaces with member groups (waiting on workspace member groups)
- **No funnel / conversion analytics** (e.g., "submitted → approved on first review: 67%")
- **No retention / engagement metrics** (DAU, WAU, return rate)
- **No content quality metrics** (average doc length, time-on-doc, edit frequency)
- **No performance metrics** (slow page loads, API errors, sync failures) — these belong in observability, not user-facing analytics
- **No goals / OKRs** ("we want to reduce average review turnaround to <24h")
- **No segment filters** (filter by member group, by document folder, by task label)
- **No real-time updates** — dashboard is static; refresh required to see new data
- **No print-friendly layout** for sharing in reviews
- **No annotations** ("we shipped feature X here, see the spike in activity")
#### 17.C.2 What top platforms do for analytics
- **Linear Insights**: Velocity per cycle, throughput, scope changes, burndown, completion rate, time-to-merge from issue creation. Custom views with date ranges. Per-team and per-project filters.
- **Notion Analytics (Plus+)**: Page views, edits, popular content, member activity. Workspace-level and per-page. Comparison periods.
- **Confluence Analytics (Premium)**: Space activity, page popularity, top contributors, search queries, permission changes.
- **Asana Universal Reporting**: Custom dashboards from any project field. Charts: bar, line, pie, donut, burndown, lollipop. Filters, group-by, segment compare. Scheduled email reports.
- **Slack Analytics**: Active users (DAU/WAU/MAU), messages by channel/user, file uploads, integration usage, retention cohorts. Member directory analytics.
- **GitHub Insights**: Pulse (week summary), contributors graph, traffic, code frequency, network, dependency graph.
- **Plausible / Mixpanel for product analytics**: Funnels, cohort retention, A/B tests, custom events. Not workspace analytics, but the techniques apply.
The minimum to be **competent**:
1. Date-range picker (last 7 / 28 / 90 days, custom)
2. Comparison period ("vs prior period")
3. Drill-down from any metric
4. CSV export
5. 6-8 chart types beyond throughput + activity (e.g., per-member breakdown over time, status distribution change over time, document length growth)
6. Saved views / dashboards
7. Permission-aware (Manager+ for workspace-wide, Owner for sensitive metrics)
You have foundations 1 (kind of, fixed ranges) and 7 (Manager+ gate). Missing 2-6.
#### 17.C.3 The honest assessment
The Analytics surface is **the most pleasantly surprising of any surface we've reviewed.** The frontend is real, the design intent is clear ("calm" not "chart spam"), and the academic-conditional block shows genuine product thinking. This puts it ahead of templates, tasks, file tree, comments — surfaces where the spec is impressive but the code is starter.
**However**, the surface is currently mock-only. The hard work is the backend:
- Compute KPIs efficiently (don't query the entire workspace for every dashboard load)
- Pre-aggregate over time windows (daily rollup tables for activity_events; pre-computed weekly throughput)
- Cache hot queries (Redis with 5-min TTL is plenty for analytics)
- Handle large workspaces (10k+ members, 100k+ events) without slowing the page
- Time zone handling (managers in different TZ see different "today")
The frontend is a pretty wrapper over data that doesn't exist yet. Backend implementation is the real work.
#### 17.C.4 The schema additions for real analytics
You don't need new tables for v1 analytics — the existing `ActivityEvent`, `Task`, `Document`, `DocumentSubmission`, `Comment`, `WorkspaceMember` tables already contain everything needed. What you need is **aggregation infrastructure**:
```prisma
// Pre-computed daily metrics, refreshed by a worker job
model WorkspaceMetricsDaily {
  id                       String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId              String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  metricDate               DateTime [@map](https://github.com/map)("metric_date") [@db](https://github.com/db).Date
  
  // Activity counters
  activityEventCount       Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("activity_event_count")
  
  // Document counters
  documentsCreated         Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("documents_created")
  documentsSubmitted       Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("documents_submitted")
  documentsApproved        Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("documents_approved")
  documentsChangesRequested Int     [@default](https://github.com/default)(0) [@map](https://github.com/map)("documents_changes_requested")
  
  // Task counters
  tasksCreated             Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("tasks_created")
  tasksCompleted           Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("tasks_completed")
  tasksReopened            Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("tasks_reopened")
  
  // Comment counters
  commentsCreated          Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("comments_created")
  mentionsCreated          Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("mentions_created")
  
  // Member counters
  activeMembers            Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("active_members")
  // ^ members with at least one activity event today
  
  // Academic-specific
  reviewsPending           Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("reviews_pending")
  reviewsCompleted         Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("reviews_completed")
  avgReviewTurnaroundMins  Decimal? [@map](https://github.com/map)("avg_review_turnaround_mins") [@db](https://github.com/db).Decimal(10, 2)
  
  computedAt               DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("computed_at") [@db](https://github.com/db).Timestamptz(6)
  
  @@unique([workspaceId, metricDate])
  @@index([workspaceId, metricDate(sort: Desc)])
  @@map("workspace_metrics_daily")
}
model MemberMetricsDaily {
  id                  String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId         String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  userId              String   [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  metricDate          DateTime [@map](https://github.com/map)("metric_date") [@db](https://github.com/db).Date
  
  documentsAuthored   Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("documents_authored")
  documentsEdited     Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("documents_edited")
  tasksCompleted      Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("tasks_completed")
  tasksAssigned       Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("tasks_assigned")
  commentsAuthored    Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("comments_authored")
  mentionsReceived    Int      [@default](https://github.com/default)(0) [@map](https://github.com/map)("mentions_received")
  
  computedAt          DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("computed_at") [@db](https://github.com/db).Timestamptz(6)
  
  @@unique([workspaceId, userId, metricDate])
  @@index([workspaceId, metricDate(sort: Desc)])
  @@index([userId, metricDate(sort: Desc)])
  @@map("member_metrics_daily")
}
model SavedView {
  id            String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  ownerId       String   [@map](https://github.com/map)("owner_id") [@db](https://github.com/db).Uuid
  scope         ViewScope
  // ^ tasks | documents | analytics | files
  name          String   [@db](https://github.com/db).VarChar(120)
  visibility    ViewVisibility [@default](https://github.com/default)(private)
  config        Json     [@db](https://github.com/db).JsonB
  // ^ filters, group-by, sort, date range
  createdAt     DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  @@map("saved_views")
}
enum ViewScope {
  tasks
  documents
  analytics
  files
  
  @@map("view_scope")
}
```
Two pre-aggregation tables (workspace daily, member daily) and one saved-view table. Worker job refreshes daily metrics every hour or on-write.
#### 17.C.5 The phased plan for analytics
**Phase A0 (backend, ~2-3 weeks):**
- Implement metrics computation worker (compute yesterday's daily rollup for all active workspaces)
- API endpoints for analytics snapshot, member contribution, throughput, document progress
- Cache layer (Redis 5-min TTL)
- Permission gate (Manager+ middleware)
**Phase A1 (real charts, ~2 weeks):**
- Date-range picker (last 7 / 28 / 90 / custom)
- Comparison period ("vs prior period")
- Wire existing frontend to real backend
- Real-time refresh (or 1-minute auto-refresh)
**Phase A2 (depth, ~3-4 weeks):**
- Drill-down from each metric to underlying records
- CSV export
- Saved views (multiple custom dashboards)
- Per-member deep-dive page
**Phase A3 (advanced, ~3-4 weeks):**
- Custom KPIs (admins pick which 4 to show)
- Alerts / thresholds with notification triggers
- Funnel analytics for academic submissions (submit → first review → approved %)
- Goal tracking ("reduce review turnaround to <24h")
- Scheduled email reports
- Print-friendly layout
#### 17.C.6 The fork choice for analytics
**Fork XA: All phases (~10-13 weeks).** Best-in-class workspace analytics.
**Fork XB: Phases A0 + A1 (~4-5 weeks).** Wire the existing pretty frontend to real backend with date ranges and comparisons. Most teams ship at this depth.
**Fork XC: Defer entirely.** Keep mock analytics until customer demand is clear. Probably 3-6 months before complaints accumulate.
**Honest recommendation: Fork XB.** Same logic as the workspace surface — the frontend is the strongest of the surfaces; backend wiring is the obvious next step. Phase A0 alone is enough to make the page real; A1 makes it useful. Phase A2/A3 wait for customer signal.
---
### 17.D Cumulative roadmap (final update with all 17 surfaces)
| Surface | Recommended fork | Weeks |
|---|---|---|
| Phase 0 foundations | NestJS + Vitest + fixtures + observability + CI + DB | 4-5 |
| Phase 1 production readiness | prod env + security + integration tests + coverage | 4-6 |
| Phase 1.5 file uploads (Fork FB) | F0 + F1: backend + UI + previews + quotas | 5-6 |
| Editor depth (Fork B / professional) | §11.10 | 6-8 |
| Real templates | §11.10 follow-on | 2-3 |
| Diagrams + export | §11.10 follow-on | 3-4 |
| Tasks (Fork TC: 5 must-haves) | §12.10 | 3-5 |
| Tasks (Fork TB: Linear-lite) | §12.10 | 6-7 |
| Comments (Fork CB: Tier 1) | §13.7 | 3-4 |
| File tree (Fork FB: Tier 1) | §14.8 | 3-4 |
| Workspace (Fork WC: reactive) | §15.8 | 2 |
| Collab depth | §6.1 | 4-6 |
| Academic (Fork EB: minimum viable) | §16.5 | 6-8 |
| Professional (Fork PC: defer entirely) | §17.A.5 | 0 (rolled into Tasks Fork TB) |
| Files Phase F2 (virus scan, versioning) | §17.B.5 | 2 |
| Analytics (Fork XB: real backend) | §17.C.6 | 4-5 |
| **Cumulative ("professional" everywhere)** | | **57-73 weeks** |
That's now **13-17 months** of focused engineering for a coherent v1 across all surfaces. World-class everywhere extends to 24-32 months.
This is the most accurate cumulative estimate we've produced. Earlier roadmap totals from Parts 14-16 didn't include analytics backend or the full files implementation; this one does.
### 17.E Summary across the three surfaces
| Surface | Spec quality | Code reality | Recommended fork | Weeks |
|---|---|---|---|---|
| Professional workspace | thin (just labels) | 5% (labels only) | PC: defer, fold into Tasks Fork TB | 0 |
| Files | rich and complete | 0-10% (schema unclear) | FB: F0 + F1 | 5-6 |
| Analytics | competent | 60% (frontend only) | XB: A0 + A1 | 4-5 |
The pattern across the three surfaces is the same we've seen everywhere: **spec quality outpaces implementation**. Files is the most extreme — comprehensive spec, no code. Analytics is the most balanced — code matches frontend half, backend half is missing. Professional is the most overstated — spec promises features that v1 doesn't deliver.
The 17 parts of investigation are now genuinely complete.
---
## Closing Synthesis Across All 17 Parts
Across investigation Parts 1-17, we've now mapped:
**Foundations (Parts 1-6):**
1. NestJS migration (backend framework gap)
2. Testing methodology (3 runners, no coverage, no E2E)
3. CI / Docker / DB / Infra (CI works, no observability/IaC/security scanning, no production env)
4. Agent rules + frontend + session memory (best in class for docs, gaps in enforcement)
5. Realtime collab / Hocuspocus (deferred until Phase 0)
6. External session state (formalize into repo or Obsidian/Notion)
**Surfaces (Parts 7-17):**
7. Templates + document editor (25% of world-class)
8. Tasks (30% of world-class)
9. Comments (60% of world-class)
10. File tree (40% of world-class)
11. Workspace (65% of world-class — strongest)
12. Academic submission & review (10-15% of world-class — most under-designed)
13. Professional workspace mode (5% — least differentiated, fold into Tasks)
14. Files & attachments (0-10% — spec rich, code poor)
15. Analytics (60% — frontend strong, backend mock)
The accumulated decision matrix is now around **80 architecture/scope choices** clustered around **12 critical ones**:
1. Phase 0 foundations acceptance (4-5 weeks before any feature work)
2. NestJS migration approach (Express + class-validator + Vitest)
3. Template + editor fork (Fork B: professional grade, 6-8 weeks)
4. Tasks fork (TC then TB: 5 must-haves first, Linear-lite later)
5. Comments fork (CB: Tier 1, 3-4 weeks)
6. File tree fork (FB: Tier 1, 3-4 weeks)
7. Workspace fork (WC: reactive, 2 weeks)
8. **Academic fork (EB: minimum viable academic, 6-8 weeks — your differentiation)**
9. Professional fork (PC: defer entirely, 0 weeks)
10. Files fork (FB: Phases F0 + F1, 5-6 weeks)
11. Analytics fork (XB: real backend + date ranges, 4-5 weeks)
12. Rule system additions (current-state, session logs, skill cards, husky, lint — 1 week)
### The recommended sequencing across all 17 parts
If you accept these forks, the execution order maximizing learning + minimizing rework is:
**Quarter 1 (Phase 0 + foundations, 8-11 weeks):**
- Story 1: NestJS migration (4-5 weeks)
- Story 2: Vitest backend migration + coverage (1 week)
- Story 3: Test fixtures package (1 week)
- Story 4: Observability bootstrap (Sentry + OpenTelemetry, 2 weeks)
- Story 5: CI hardening (composite action + concurrency + timeouts, 1 day)
- Story 6: Database safety (schema-drift gate + seed + backup runbook, 1 day)
- Story 7: Rule system additions (current-state.md + session logs + skill cards + husky + lint, 1 week)
**Quarter 2 (Phase 1 + first feature surfaces, 10-13 weeks):**
- Story 8: Production environment provisioning (4-6 weeks)
- Story 9: File uploads Phase F0 (2-3 weeks)
- Story 10: Tasks Fork TC (3-5 weeks)
**Quarter 3 (collab + editor depth, 12-16 weeks):**
- Story 11: NestJS collab service for Hocuspocus (4-6 weeks)
- Story 12: Editor depth Fork B (6-8 weeks)
- Story 13: Real templates (2-3 weeks)
**Quarter 4 (academic differentiation + polish, 12-15 weeks):**
- Story 14: Academic Fork EB (6-8 weeks) ⭐ your differentiation
- Story 15: Comments Fork CB (3-4 weeks)
- Story 16: Files Fork FB (3-4 weeks remaining work)
**Quarter 5+ (continue with remaining):**
- Story 17: Analytics Fork XB (4-5 weeks)
- Story 18: Tasks Fork TB (6-7 weeks)
- Story 19: File tree Fork FB (3-4 weeks)
- Story 20: Workspace Fork WC (reactive, 2 weeks)
- Story 21: Diagrams + export (3-4 weeks)
- Story 22: Collab depth (4-6 weeks)
Total v1 ship: **13-17 months** for "professional grade everywhere with academic as world-class differentiation."
### What changes if you do this versus continuing as-is
If you adopt this plan:
- **Phase 0 closes the foundation gap.** No more "rules say NestJS, code is node:http." No more 5-round PRs because local validation got skipped. No more silent CI failures because nothing tracks coverage.
- **Academic Fork EB makes the platform commercially defensible.** "Notion plus academic structure" is a marketable identity. "Generic Notion clone" is not.
- **Files Fork FB unblocks editor image blocks, attachment chips, file libraries.** Three downstream features depend on this; doing it once unlocks all three.
- **Tasks Fork TC ships the 5 most-requested features (subtasks, watchers, saved views, bulk actions, calendar).** Tasks become competent without committing to Linear-lite-tier scope.
- **Professional mode stays simple.** No GitHub/Slack/Figma integrations to maintain. Customer demand can drive that decision later.
- **Analytics Fork XB makes the existing pretty page real.** Backend computed metrics with caching; date ranges; comparison periods. Manager+ users get genuine workspace insight.
- **Session continuity formalizes.** current-state.md, session logs, husky pre-push hook, ESLint plugins. Future agents (Claude, Devin, antigravity, future hires) all start from the same base of truth.
If you continue as-is:
- **Each new story compounds the framework drift.** Issue #50 lands on `node:http`; issue #51 too; the NestJS migration cost grows linearly.
- **CI gates keep slipping.** verify-email PR's 5-round failure mode repeats per story.
- **Academic is just labels.** Your differentiation never materializes.
- **Documentation drift accelerates.** specs describe a system that doesn't exist; agents try to honor both realities.
- **Solo bandwidth gets eaten** by reactive bug-fixing across uneven surfaces.
### What I now recommend
This is my final recommendation across the 17-part investigation. After this, the next thing that adds genuine value is decisions and execution.
1. **Take 2-4 hours today** to make the 12 critical decisions. Write them in a single ADR: `docs/adrs/2026-04-29-system-wide-scope-decisions.md`. Commit it.
2. **Take 1 hour to write `docs/architecture/current-state.md`.** Use the template from Part 7.3. This becomes the persistent state doc every future agent reads first.
3. **Take 4-6 hours over 2 days to set up the rule system foundations.** Husky pre-push hook, ESLint plugins (jsx-a11y, testing-library, vitest), 8 new skill cards (drafted in Part 7.4). Commit each as a separate small PR.
4. **Tell me when those steps are complete.** I'll write the first execution prompt — NestJS migration story, the same shape as the verify-email round prompts. With current-state.md and the new rules in place, antigravity (or whichever tool) executes against a foundation that prevents the round-chasing pattern.
5. **Ship Phase 0 stories one at a time.** Each commits a session log to `docs/ai/sessions/`. Each updates current-state.md. Each lands an ADR for any non-default architectural decision. After ~8-11 weeks, foundations are stable.
6. **Then ship feature stories one at a time** following the Quarter 2-5 sequencing above. Re-evaluate decision-points at each quarter boundary based on what you've learned.
That's the path from where you are today to a coherent v1 in 13-17 months. It's not fast, but it's honest. Most solo AI builders never reach this clarity; you're already past the hardest part — the planning. The execution is comparatively mechanical now.
### Final word
The investigations are complete. We've mapped 17 surfaces, accumulated ~80 decisions, identified the differentiation strategy (document↔task linking + academic project management + collaborative writing), recommended fork choices for each surface, and produced a sequenced 13-17 month roadmap.
The next message in this conversation should not be another investigation request. It should be one of:
- "I've made these decisions: [list]" — and I write the first execution prompt
- "Write the first execution prompt assuming these defaults: [defaults]" — and I do that with the recommended forks
- "I want to investigate [specific surface] before deciding" — and I run one more investigation, but this is now genuinely diminishing returns
Whichever you pick, this is the closing line of the investigation phase. Everything from here forward is execution.
Tell me which it is.
---
## Part 18 — Re-Evaluation: Notifications & Members
This part covers the two surfaces in one document. Notifications first because it's the larger gap.
---
### 18.A Notifications System
#### 18.A.1 Executive summary
**What you have today:**
- A clean two-model schema: `Notification` (per-user record) + `NotificationPreference` (per-user JSONB toggles)
- Per-notification fields: `recipientId`, `workspaceId`, `actorId`, `type`, `title`, `body`, `resourceType`, `resourceId`, `url`, `metadata` JSONB, `isRead`, `readAt`
- Per-preference fields: `inApp` JSONB, `email` JSONB, `dailyDigestEnabled`, `weeklyDigestEnabled`
- Comprehensive notification type taxonomy (~12 workspace-scoped + 3 global)
- Two delivery channels specified: in-app (P0) and email (P1)
- Real-time delivery via Socket.IO room `user:<userId>` with events `notification:new`, `notification:count`, `notification:read`
- Polling fallback every 30s when sockets fail
- Dispatch rules with idempotency via `eventId`, preference evaluation, noise-control rules
- API endpoints: list with filters/pagination, mark-read (single/all), get/update preferences
- Frontend: `apps/web/src/features/notifications/pages/Notifications.tsx` wraps a `NotificationCenter` component; bell icon with unread badge (`99+` cap); preferences UI in settings with toggle matrix
- Retention: 90 days OR 2,000 per user (whichever smaller), cleanup via background job
This is a **competent baseline** — everything Slack/Notion/Linear ship at minimum. Ahead of templates, tasks, file tree, and academic in completeness.
**What you don't have:**
- **No push notifications** (browser Web Push, mobile FCM/APNS)
- **No SMS notifications** (high-priority alerts)
- **No notification grouping / batching** ("3 new comments on Document X" instead of 3 separate notifications)
- **No smart digest** (only fixed daily/weekly toggles; no "send digest only when there are >5 items")
- **No quiet hours / Do Not Disturb** (no time-based suppression, no timezone-aware delivery)
- **No notification snooze** ("remind me about this in 4 hours")
- **No notification categories beyond type** (no priority levels: urgent/normal/low)
- **No rich notification cards in-app** (your `body` is plain text; no inline buttons, no avatar+context preview)
- **No notification action buttons** (Approve / Reject directly from notification, GitHub-style)
- **No notification preferences per-workspace** (it's all-or-nothing across all workspaces)
- **No global mute** ("I'm on vacation, mute everything for a week")
- **No notification rules / filters** ("only notify me about tasks assigned to me, not all task changes")
- **No notification-level mention follow-up** (Slack lets you "follow this thread" → all replies notify you)
- **No undo** ("oops, I marked all read, restore unread")
- **No bookmarks / saved notifications** (treat important notifications like pinned items)
- **No notification search** (find a specific notification you remember)
- **No mobile-optimized notifications** (no service worker for offline, no badge sync)
- **No email reply-to-comment** (most platforms let you reply to email and it posts a comment)
- **No email unsubscribe per-type** at the email level (one-click unsubscribe per notification type in email footer is universal)
- **No deep-linking with auth** (clicking email notification takes user to login → original target after auth)
- **No analytics on notifications** (delivery rate, open rate, click rate, time-to-read by type)
- **No A/B testing on notification copy** (which subject line drives more opens?)
- **No notification templates** (consistent design across in-app + email)
#### 18.A.2 What top platforms do for notifications
- **Slack**: Real-time push everywhere, rich cards with action buttons, threading-aware grouping, custom keywords, channel-level mute, DnD schedule, mobile-first, replied-to-message tracking, AI-summarized "catch up" digests.
- **Notion**: In-app + email + mobile push, per-page subscription, mention bundling (10 mentions in one page = one notification), reply-by-email creates a comment, weekly digest of all activity.
- **GitHub**: Email is king. Per-repo notification filters. "Watching" vs "Participating" modes. Reply-by-email. Saved notifications. Action buttons in email (Merge, Approve). Inbox view with priority.
- **Linear**: Minimal noise by design. Subscription per issue/project/cycle. Mobile push. Saved searches notify on match. Heavy keyboard navigation in notification center.
- **Asana**: Inbox with smart sorting. "My priorities" filter. Snooze. Email digest. Slack/Teams/email-as-channel.
- **Front (email collaboration)**: SLA-aware notifications. Routing rules. Escalation chains.
The minimum to be **competent**:
1. In-app + email + browser push
2. Per-type preferences (you have this)
3. Notification grouping for repeat events
4. Quiet hours / DnD
5. Mark all read
6. Click-through deep linking with auth handling
7. One-click unsubscribe in email
8. Real-time delivery with polling fallback (you have this)
You have 5 of the 8 (1 partial: no browser push; 3 missing: grouping, DnD, email unsubscribe). Solid foundation.
#### 18.A.3 The honest assessment
The notifications surface is **the second-strongest surface after workspace** (~70% of world-class). The schema is well-modeled. The dispatch rules are thoughtful (idempotency, preference evaluation, noise control). The frontend has real components.
The gaps cluster into three categories:
1. **Channel breadth** — push (browser/mobile) and SMS missing
2. **User control** — DnD, snooze, per-workspace preferences, mute, smart filters all missing
3. **Polish** — grouping, action buttons, rich cards, email reply, deep-link auth — the things that take a notification system from "works" to "delightful"
Surprisingly, this is one of the surfaces where shipping the spec gets you to "professional grade" with relatively little extra design work. Most platforms get the notification system to ~70% in early versions and stay there for years.
#### 18.A.4 The schema additions for stronger notifications
```prisma
// Add to existing Notification model:
model Notification {
  // existing fields stay
  
  // ADD
  priority         NotificationPriority [@default](https://github.com/default)(normal)
  // ^ urgent | normal | low
  
  groupKey         String?  [@map](https://github.com/map)("group_key") [@db](https://github.com/db).VarChar(120)
  // ^ for batching: notifications with same groupKey collapse in UI
  
  snoozedUntil     DateTime? [@map](https://github.com/map)("snoozed_until") [@db](https://github.com/db).Timestamptz(6)
  // ^ "remind me later"
  
  bookmarkedAt     DateTime? [@map](https://github.com/map)("bookmarked_at") [@db](https://github.com/db).Timestamptz(6)
  // ^ user-saved notifications
  
  emailSentAt      DateTime? [@map](https://github.com/map)("email_sent_at") [@db](https://github.com/db).Timestamptz(6)
  // ^ if/when this notification was emailed
  
  pushSentAt       DateTime? [@map](https://github.com/map)("push_sent_at") [@db](https://github.com/db).Timestamptz(6)
  // ^ if/when this notification was pushed
}
// Add to existing NotificationPreference model:
model NotificationPreference {
  // existing fields stay
  
  // ADD
  push            Json?    [@db](https://github.com/db).JsonB
  // ^ per-type toggles for browser/mobile push
  
  quietHoursEnabled Boolean [@default](https://github.com/default)(false) [@map](https://github.com/map)("quiet_hours_enabled")
  quietHoursStart   String? [@map](https://github.com/map)("quiet_hours_start") [@db](https://github.com/db).VarChar(5)
  // ^ "22:00"
  quietHoursEnd     String? [@map](https://github.com/map)("quiet_hours_end") [@db](https://github.com/db).VarChar(5)
  // ^ "08:00"
  timezone          String? [@db](https://github.com/db).VarChar(60)
  // ^ "America/New_York" for accurate quiet-hours
  
  globalMutedUntil  DateTime? [@map](https://github.com/map)("global_muted_until") [@db](https://github.com/db).Timestamptz(6)
  // ^ "vacation mode"
  
  perWorkspaceOverrides Json? [@map](https://github.com/map)("per_workspace_overrides") [@db](https://github.com/db).JsonB
  // ^ workspace-specific muting/preferences
}
// New model: Push subscriptions (browser/mobile)
model PushSubscription {
  id            String          [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  userId        String          [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  endpoint      String          [@db](https://github.com/db).VarChar(500)
  // ^ FCM/APNS/Web Push endpoint URL
  keys          Json            [@db](https://github.com/db).JsonB
  // ^ encryption keys (p256dh, auth for Web Push)
  platform      PushPlatform
  // ^ web | ios | android
  deviceLabel   String?         [@map](https://github.com/map)("device_label") [@db](https://github.com/db).VarChar(120)
  lastUsedAt    DateTime?       [@map](https://github.com/map)("last_used_at") [@db](https://github.com/db).Timestamptz(6)
  createdAt     DateTime        [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  user          User            [@relation](https://github.com/relation)(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, endpoint])
  @@index([userId])
  @@map("push_subscriptions")
}
// New model: Subscription preferences (watch a thread, page, project, etc.)
model NotificationSubscription {
  id            String                   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String                   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  userId        String                   [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  resourceType  SubscriptionResourceType
  // ^ document | task | comment_thread | folder | workspace
  resourceId    String                   [@map](https://github.com/map)("resource_id") [@db](https://github.com/db).Uuid
  level         SubscriptionLevel        [@default](https://github.com/default)(participating)
  // ^ all_activity | participating | mentions_only | none
  createdAt     DateTime                 [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  user          User                     [@relation](https://github.com/relation)(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, resourceType, resourceId])
  @@index([resourceType, resourceId])
  @@map("notification_subscriptions")
}
enum NotificationPriority {
  urgent
  normal
  low
  
  @@map("notification_priority")
}
enum PushPlatform {
  web
  ios
  android
  
  @@map("push_platform")
}
enum SubscriptionResourceType {
  document
  task
  comment_thread
  folder
  workspace
  
  @@map("subscription_resource_type")
}
enum SubscriptionLevel {
  all_activity
  participating
  mentions_only
  none
  
  @@map("subscription_level")
}
```
That's **2 new models + 4 new enums + 5 new columns on Notification + 5 new columns on NotificationPreference**. Each unlocks a feature class.
#### 18.A.5 The phased plan
**Tier 1 (must-have, ~3-4 weeks):**
- Notification grouping (`groupKey`) and batched UI rendering
- Browser push notifications (Web Push API + Service Worker + `PushSubscription`)
- Quiet hours / DnD per user with timezone awareness
- Per-workspace preference overrides
- Click-through deep-link auth handling (login redirect preserves notification target)
- One-click email unsubscribe per type (link in email footer)
- Snooze action ("remind me in 4h / tomorrow / next week")
**Tier 2 (Linear/Notion-tier, ~3-4 weeks):**
- Subscriptions (watch document/task/thread independent of mention)
- Action buttons in notifications (Approve / Reject / Reply directly)
- Rich notification cards (avatar + context preview)
- Mention bundling (10 mentions on one page → one notification)
- Bookmark notifications (save important ones)
- Notification search
- Mobile push (FCM + APNS)
**Tier 3 (advanced, ~3-4 weeks):**
- Email reply-to-comment (inbound mail processing via SES/Mailgun)
- Smart digest (only when N+ items pending)
- Notification analytics (delivery, open, click rates)
- AI-summarized "catch up" feature for high-volume users
- Custom notification rules / filters per user
- SMS notifications for urgent priority
**Total to "world-class" notifications:** ~9-12 weeks across all three tiers.
#### 18.A.6 The fork choice for notifications
**Fork NA: Tier 1 + 2 (~6-8 weeks).** Best-in-class notifications excluding email-reply and analytics.
**Fork NB: Tier 1 only (~3-4 weeks).** Grouping, push, DnD, deep-link auth, snooze, email unsub. The features that make notifications stop feeling 2010-era.
**Fork NC: Defer entirely.** Current spec is solid. Wait for customer feedback to drive priorities.
**Honest recommendation: Fork NB.** Tier 1 closes the worst gaps (push, DnD, grouping). Without these, notifications feel old. Tier 2 features can wait for usage data. Tier 3 features (email reply, AI summaries) are luxuries.
---
### 18.B Members System
#### 18.B.1 Executive summary
**What you have today:**
- Member list page at `apps/web/src/features/members/components/member-list.tsx`
- Workspace composition stats (counts by role: Owner, Admin, Manager, Member, Viewer)
- Invite dialog for Owner/Admin
- Pending invitations table for managers
- Role-based permission gating (`canManage`, `canInvite`)
- Read-only mode for archived workspaces
- Loading skeletons and empty states
- Member count badges
- Page header with governance context
- Transfer-ownership dialog (per `apps/web/docs/changelog.md`)
**What you don't have:**
- **No member detail page** (click a member → see their full profile, contributions, activity)
- **No member search** within the list
- **No member filter** by role
- **No member sort** by name / role / joined / last active
- **No bulk actions** on members (multi-select → bulk role change, bulk remove)
- **No member offboarding wizard** (when removing a member, what happens to their docs/tasks/comments?)
- **No "transfer items before removing"** flow (reassign their owned tasks/docs to someone else)
- **No member activity timeline** (Sarah's last 30 days of edits, comments, submissions)
- **No member contribution stats** in the list (docs authored, tasks completed, comments made)
- **No last-active indicator** on member rows (despite `lastAccessedAt` being in schema)
- **No avatar with online status** (green dot for currently active, grey for offline)
- **No member directory for large workspaces** (50+ members need a directory experience, not a list)
- **No invitation resend / revoke** UI for individual pending invites
- **No invitation expiry warnings** ("expires in 2 days")
- **No bulk invitation** ("paste 30 emails, all join as Members")
- **No CSV import of members**
- **No member groups** (already noted in workspace re-evaluation)
- **No guest accounts** (already noted)
- **No external collaborator invites** (limited-time / scope-limited members)
- **No member roles audit trail** (when did Sarah become an Admin? Who promoted her?)
- **No member departure record** (when did Bob leave? Why?)
- **No "deactivated" state** distinct from "removed" (preserve their docs but disable login)
- **No member self-service** (member changes their own profile, leaves workspace, requests role upgrade)
- **No member directory across workspaces** (find someone in any workspace I share with them)
#### 18.B.2 What top platforms do for members
- **Notion**: Member directory with search, last active, role badges, page-permission overrides, multi-select bulk actions, guest accounts, member groups (Plus+), member-by-email lookup.
- **Slack**: Member directory with profile, status, time zone, do not disturb status, full activity history, custom profile fields.
- **Asana**: Workspace members + project members with separate management, capacity view (workload per person), guest accounts, sso provisioning.
- **Linear**: Minimal member list with role, joined date, last active. Heavy keyboard nav. Multi-select with bulk role change.
- **GitHub**: Members + Outside Collaborators + Teams. Detailed member page with repos, activity. Audit log for member changes. SSO integration.
- **Confluence**: Space directory with detailed member pages, contribution stats, activity feed per user.
The minimum to be **competent**:
1. Member list with role badges (you have this)
2. Search/filter by role
3. Last active indicator
4. Member detail page with activity
5. Role change UI with confirmation
6. Remove member with offboarding (reassign owned items)
7. Pending invitations management (resend, revoke, copy link)
8. Multi-select for bulk operations
9. Audit trail for role/membership changes
You have foundations 1 and 7 (partially). Missing 2-6, 8, 9.
#### 18.B.3 The honest assessment
The members surface is **the most uneven of the strong-foundation surfaces**. The schema and API are excellent (workspace re-evaluation gave it 65%), but the frontend is shallower than it appears. You have a member list. You don't have a member experience.
The single most-painful gap is **member offboarding**. When a member leaves a workspace:
- Their tasks: become unassigned silently
- Their authored docs: stay under their name (with `authorNameSnapshot` preserving attribution — strong)
- Their comments: stay (with snapshot preserved — strong)
- Their pending tasks/reviews: silently drop
- Their pending invitations they sent: stay pending
- Their work-in-progress drafts: lost
There's no flow that says "Sarah is leaving. Please reassign her 12 tasks and 3 documents before completing removal."
Top platforms make this a wizard:
1. Show what Sarah owns
2. Bulk-assign each category to someone
3. Optional: send Sarah a notification "your work has been reassigned"
4. Then complete removal
This single feature would be ~1 week of focused work and would dramatically improve the member-management experience.
#### 18.B.4 The schema additions for stronger members
The data model for members is already strong. The additions are mostly UI-supporting and audit-trail features:
```prisma
// Add to existing WorkspaceMember model:
model WorkspaceMember {
  // existing fields stay
  
  // ADD
  status        MembershipStatus [@default](https://github.com/default)(active)
  // ^ active | deactivated | suspended | pending_removal
  
  isOnline      Boolean          [@default](https://github.com/default)(false) [@map](https://github.com/map)("is_online")
  // ^ updated by socket presence (denormalized for UI)
  
  customTitle   String?          [@map](https://github.com/map)("custom_title") [@db](https://github.com/db).VarChar(100)
  // ^ workspace-specific title beyond role label, e.g., "Senior PM"
  
  joinedVia     JoinSource?      [@map](https://github.com/map)("joined_via")
  // ^ invitation | self_signup | sso | bulk_import | transfer
  
  invitationId  String?          [@map](https://github.com/map)("invitation_id") [@db](https://github.com/db).Uuid
  // ^ which invitation they accepted (null for owner / sso)
}
// New model: membership audit trail
model MembershipAuditEntry {
  id            String                [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String                [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  membershipId  String                [@map](https://github.com/map)("membership_id") [@db](https://github.com/db).Uuid
  actorId       String                [@map](https://github.com/map)("actor_id") [@db](https://github.com/db).Uuid
  // ^ who performed the change
  action        MembershipAction
  // ^ created | role_changed | suspended | reactivated | removed | transferred
  fromValue     Json?                 [@map](https://github.com/map)("from_value") [@db](https://github.com/db).JsonB
  toValue       Json?                 [@map](https://github.com/map)("to_value") [@db](https://github.com/db).JsonB
  reason        String?               [@db](https://github.com/db).Text
  createdAt     DateTime              [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  @@index([workspaceId, createdAt(sort: Desc)])
  @@index([membershipId, createdAt(sort: Desc)])
  @@map("membership_audit")
}
// New model: member offboarding state machine
model MembershipOffboarding {
  id              String                  [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId     String                  [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  membershipId    String                  [@map](https://github.com/map)("membership_id") [@db](https://github.com/db).Uuid
  initiatedById   String                  [@map](https://github.com/map)("initiated_by") [@db](https://github.com/db).Uuid
  status          OffboardingStatus       [@default](https://github.com/default)(initiated)
  // ^ initiated | reassignments_pending | confirmed | cancelled | completed
  reassignments   Json                    [@db](https://github.com/db).JsonB
  // ^ { tasks: { reassignTo: userId }, documents: { reassignTo: userId }, drafts: 'delete' }
  initiatedAt     DateTime                [@default](https://github.com/default)(now()) [@map](https://github.com/map)("initiated_at") [@db](https://github.com/db).Timestamptz(6)
  completedAt     DateTime?               [@map](https://github.com/map)("completed_at") [@db](https://github.com/db).Timestamptz(6)
  
  @@map("membership_offboarding")
}
enum MembershipStatus {
  active
  deactivated
  suspended
  pending_removal
  
  @@map("membership_status")
}
enum JoinSource {
  invitation
  self_signup
  sso
  bulk_import
  transfer
  
  @@map("join_source")
}
enum MembershipAction {
  created
  role_changed
  suspended
  reactivated
  removed
  transferred
  
  @@map("membership_action")
}
enum OffboardingStatus {
  initiated
  reassignments_pending
  confirmed
  cancelled
  completed
  
  @@map("offboarding_status")
}
```
That's **2 new models + 4 new enums + 5 new columns on `WorkspaceMember`**. Modest. Each addition serves a real product need.
#### 18.B.5 The phased plan for members
**Tier 1 (must-have, ~3-4 weeks):**
- Member detail page (`/w/:workspaceId/members/:memberId`) with avatar, role, joined date, last active, contribution stats
- Search + filter + sort on member list
- Last-active indicator on rows (uses existing `lastAccessedAt`)
- Online presence dot (uses Socket.IO `workspace:<id>` room, denormalized to `isOnline`)
- Member offboarding wizard (reassignment flow with the new `MembershipOffboarding` model)
- Pending invitation management UI: resend, revoke, copy link, expiry countdown
- Bulk invitation paste (30 emails at once)
**Tier 2 (Notion/Asana-tier, ~3-4 weeks):**
- Membership audit log with filterable timeline
- Bulk member operations (multi-select → bulk role change, bulk message, bulk remove)
- Custom titles per member (beyond role labels)
- CSV import of members
- Member self-service (leave workspace, request role upgrade, edit profile)
- Member groups integration (depends on workspace member groups landing first)
**Tier 3 (enterprise, ~4-6 weeks):**
- SCIM provisioning (auto-add/remove members from identity provider)
- SSO-driven role mapping (group X in IdP = Manager role)
- Suspend/reactivate flow (preserve everything but block login)
- Guest accounts with per-resource scoping
- Cross-workspace member directory at organization tier (depends on Organization model from §15.4)
- Member-level activity export (GDPR-compliant data extraction)
**Total to "world-class members":** ~10-14 weeks across all tiers.
#### 18.B.6 The fork choice for members
**Fork MA: Tier 1 + 2 (~6-8 weeks).** Best-in-class member management.
**Fork MB: Tier 1 only (~3-4 weeks).** Member detail, search, last-active, presence, offboarding wizard, pending invitation management, bulk invite. The features that close the painful gaps.
**Fork MC: Just the offboarding wizard (~1 week).** The single most painful gap. Skip everything else until customer demand.
**Honest recommendation: Fork MB.** Member detail page + offboarding wizard + invitation management together transform member management from "list with invite button" to "actually usable for a 50-person workspace." Three to four weeks of focused work. Tier 2 features can wait.
If you only have one week to invest, **Fork MC** (offboarding wizard alone) is the highest-impact single feature.
---
### 18.C Summary across the two surfaces
| Surface | Spec quality | Code reality | Recommended fork | Weeks |
|---|---|---|---|---|
| Notifications | rich, complete | 70% (in-app done, push missing) | NB: Tier 1 | 3-4 |
| Members | strong schema, shallow UI | 50% (list works, depth missing) | MB: Tier 1 | 3-4 |
Both surfaces have the **same shape**: schema and API are well-designed, frontend is starter-quality, the gap is closeable in 3-4 weeks of focused work each. Combined: ~6-8 weeks for both Tier 1 forks.
---
### 18.D Cumulative roadmap (final update with all 18 surfaces)
| Surface | Recommended fork | Weeks |
|---|---|---|
| Phase 0 foundations | NestJS + Vitest + fixtures + observability + CI + DB | 4-5 |
| Phase 1 production readiness | prod env + security + integration tests + coverage | 4-6 |
| Phase 1.5 file uploads (Fork FB) | F0 + F1 | 5-6 |
| Editor depth (Fork B / professional) | §11.10 | 6-8 |
| Real templates | §11.10 follow-on | 2-3 |
| Diagrams + export | §11.10 follow-on | 3-4 |
| Tasks (Fork TC: 5 must-haves) | §12.10 | 3-5 |
| Tasks (Fork TB: Linear-lite) | §12.10 | 6-7 |
| Comments (Fork CB: Tier 1) | §13.7 | 3-4 |
| File tree (Fork FB: Tier 1) | §14.8 | 3-4 |
| Workspace (Fork WC: reactive) | §15.8 | 2 |
| Collab depth | §6.1 | 4-6 |
| Academic (Fork EB: minimum viable) | §16.5 | 6-8 |
| Professional (Fork PC: defer) | §17.A.5 | 0 |
| Files Phase F2 (virus scan, versioning) | §17.B.5 | 2 |
| Analytics (Fork XB: real backend) | §17.C.6 | 4-5 |
| **Notifications (Fork NB: Tier 1)** | **§18.A.6** | **3-4** |
| **Members (Fork MB: Tier 1)** | **§18.B.6** | **3-4** |
| **Cumulative ("professional" everywhere)** | | **63-81 weeks** |
That's now **15-18 months** of focused engineering for a coherent v1 across all 18 surfaces investigated. World-class everywhere extends to 27-36 months.
This is the most accurate and complete cumulative estimate.
---
### Closing across all 18 parts of investigation
We've now investigated 18 distinct surfaces / system layers across the project. The accumulated decision matrix has roughly **90 architecture/scope choices** clustered around **14 critical ones**:
1. Phase 0 foundations acceptance
2. NestJS migration approach
3. Template + editor fork (B: professional, 6-8 weeks)
4. Tasks fork (TC: 5 must-haves, then TB)
5. Comments fork (CB: Tier 1, 3-4 weeks)
6. File tree fork (FB: Tier 1, 3-4 weeks)
7. Workspace fork (WC: reactive, 2 weeks)
8. **Academic fork (EB: differentiator, 6-8 weeks)**
9. Professional fork (PC: defer, 0 weeks)
10. Files fork (FB Phase F0+F1, 5-6 weeks)
11. Analytics fork (XB: real backend, 4-5 weeks)
12. **Notifications fork (NB: Tier 1, 3-4 weeks)**
13. **Members fork (MB: Tier 1, 3-4 weeks)**
14. Rule system additions (current-state + session logs + skill cards + husky + lint, 1 week)
Plus dozens of sub-decisions per fork. All documented across Parts 1-18.
### What's left (if anything)
Surfaces still uninvestigated, in order of likely value:
1. **Search system** — workspace-wide search across docs, tasks, comments, files. Currently each entity has its own `search_vector` but no unified surface.
2. **Activity feed** — workspace-level audit log + activity feed. Schema exists (`ActivityEvent`); surface unclear.
3. **Admin console** — platform-level admin (manage all workspaces, all users, system settings). Distinct from workspace settings.
4. **Auth depth** — OAuth providers beyond Google (Microsoft, Apple, GitHub), 2FA/TOTP, password policies, MFA, SSO/SAML, SCIM.
5. **Onboarding flow** — first-time-user experience, workspace-creation onboarding, invitation acceptance flow.
6. **Billing / subscription** — plans, seats, usage limits, payment, invoicing, trials.
7. **Mobile responsiveness audit** — what works on mobile, what doesn't, what's broken.
8. **Accessibility audit** — WCAG 2.1 AA conformance against the actual code.
9. **Performance audit** — bundle size, Lighthouse scores, runtime perf bottlenecks.
Each follows the same pattern as Parts 17-18: ~30 minutes of investigation producing 3-5 pages of analysis and a fork recommendation. All add detail; none change the strategic conclusions.
### My final recommendation (still unchanged from Part 17)
The investigations are now genuinely complete enough. The marginal value of more investigation is low. The next thing that adds genuine value is decisions and execution.
**Three paths from here:**
1. **Make the 14 critical decisions today.** Write them as `docs/adrs/2026-04-29-system-wide-scope-decisions.md`. I write the first execution prompt (NestJS migration). We ship Phase 0 over the next 8-11 weeks.
2. **Accept my recommended forks for everything.** I write the first execution prompt with those defaults baked in. We ship.
3. **Investigate one more surface** that genuinely matters to you — pick from the 9 remaining. Same shape as Parts 17-18. Then go to path 1 or 2.
Whichever you pick, this is my closing recommendation:
> **Stop investigating. Decide. Ship.**
You have more pre-execution clarity than any solo AI builder I've seen. The remaining cost is execution discipline, not research depth. Every additional week in investigation is a week of momentum lost. The verify-email PR taught us what compounding-inaction looks like; another month of investigation would be a much larger version of that same pattern.
Tell me which path you want, and I'll do whatever the path requires. But I'd ask you to genuinely consider whether you need another investigation, or whether what's been mapped already is enough to start shipping. My honest assessment: it's enough. Has been since Part 8.
Whenever you're ready.
---
## Part 19 — Re-Evaluation: Activity Feed & Audit Log
### 19.1 Executive summary
The activity surface is **two systems intentionally separated** — a clean architectural choice that more platforms should make:
- **`ActivityEvent`** — user-facing, workspace-scoped collaboration timeline
- **`AuditLog`** — admin-facing, security/compliance immutable record
This separation is more sophisticated than what most early-stage platforms do (they conflate the two and end up with either UX noise polluting compliance logs, or compliance gaps because real security events aren't tracked separately).
**What you have today:**
- **`ActivityEvent`** schema with workspace scoping, actor snapshots (preserves attribution after user deletion), event key taxonomy, resource pointer, JSONB metadata, three indexes optimized for the common query patterns
- **`AuditLog`** schema with request ID correlation, severity levels, actor email/role denormalized (handles failed-login case where `actorId` is null), IP address + user agent for auth events, four indexes for filtering
- ~16 documented event types across workspace/document/task/comment/file domains
- ~10 audit event types covering security and admin actions
- Coalescing rules for noisy events (5-min window per user per document for edits)
- Privacy rules (no secrets, no presigned URLs, anchor hashes only)
- Permission-gated visibility (entries only visible to members who can access the underlying entity)
- Real-time delivery via Socket.IO `workspace:<id>` room
- Polling fallback every 15-30 seconds
- Two retention policies: 180 days for activity, 365 days for audit
- API endpoints: `GET /api/v1/workspaces/:wid/activity` (members) and `GET /api/v1/admin/audit` (Platform Admin only)
- Filter spec: by event type, actor, date range (activity); by actionKey, severity, date, actor email, workspace (audit)
- UI surfaces specified: workspace home recent-activity widget, full activity page, admin audit page
This is the **fourth-strongest surface** after workspace, notifications, and analytics. The schema, taxonomy, and architectural separation are all done well.
**What you don't have:**
The frontend implementation is unclear — `apps/web/src/features/activity/` was not confirmed in the deep dive. Likely some recent-activity widget built into workspace home, but the full activity page and admin audit page may be empty shells or unimplemented.
Functional gaps beyond implementation:
- **No activity grouping in UI** ("Sarah and 2 others edited Document X")
- **No activity reactions / acknowledge** ("got it" / "👍" on activity items)
- **No activity comments** (rare, but Slack/Linear allow comment-on-activity)
- **No subscription per resource** for activity ("notify me when this doc has activity")
- **No activity-to-notification bridge UI** (activity is read-passive; notifications are read-active; no clear toggle for "make this activity also a notification")
- **No personal activity feed** ("everything that involves me, across all my workspaces")
- **No activity search** beyond the documented filters
- **No activity export** (CSV for compliance, audit dumps)
- **No activity replay / timeline view** (visual timeline of project events over time)
- **No "what happened while I was away?"** summary on return after N days
- **No diff view** for events that mutate state (rename: from "X" to "Y"; role change: from Member to Manager)
- **No quoted/threaded conversations** rolled up as activity (e.g., "5 comments on Doc X today")
- **No daily / weekly digest of activity** (the notification system has digest toggles, but activity doesn't)
- **No per-persona view tuning** (Owner sees governance prioritized, Member sees collaboration prioritized)
- **No activity heat map / contribution graph** (GitHub-style green-square calendar)
- **No undo from activity feed** ("undo last role change")
- **No multi-workspace cross-feed** (your activity across all workspaces)
- **No activity-to-permalink anchoring** (deep-link to a specific event in the feed)
Audit log gaps specifically:
- **No SIEM forwarding** (Splunk/Datadog/security forwarders for enterprise)
- **No tamper-evidence** (cryptographic hashing of audit records, hash chain for forensics)
- **No retention by jurisdiction** (EU GDPR vs US HIPAA different rules)
- **No legal hold** (freeze a workspace's audit log during litigation discovery)
- **No anomaly detection** (flag unusual patterns: 50 logins from one IP in 5 minutes)
- **No CSV / structured export** for compliance audits
- **No alerting on audit events** (notify Owner when admin actions hit threshold)
- **No segregation of duties** (cross-check: did the same user create AND approve a sensitive change?)
### 19.2 What top platforms do
#### Slack activity & audit
- **Channel-level activity feed** within each channel (system messages: "Sarah joined", "Bob left")
- **Profile-level activity** ("Recently active in #channel-name")
- **Workspace audit log** (Plus+) with CSV export, date filters, action filters
- **SIEM forwarding** (Enterprise)
- **API for audit logs** so external tools can pull data
#### Notion activity
- **Per-page activity sidebar** showing all changes (timestamped, with diff for renames)
- **Workspace updates feed** ("Updates" inbox showing what changed in pages you watch)
- **Trash bin as activity** (deletions are recoverable from a separate view)
- **No separate audit log** in v1 (compliance is Enterprise-only)
#### Linear activity
- **Per-issue timeline** showing every change with diff (assignee from X to Y, status from todo to in_progress)
- **Per-project activity** rolling up issue changes
- **Personal "My Issues" timeline**
- **Audit log** (Plus+) for security-sensitive actions
#### GitHub activity
- **Per-repo activity feed** ("X committed", "Y opened PR", "Z merged")
- **Per-user activity feed / contribution graph** (the famous green squares)
- **Organization audit log** with extensive event types and CSV export
- **Per-repo audit log** for sensitive repos
- **Webhooks** for forwarding events to external systems
#### Confluence activity
- **Page activity sidebar** with full version history
- **Space activity stream** with grouping by day
- **Personal activity feed** ("recently viewed", "recently edited")
- **Audit log** at admin level, exportable
#### Jira activity
- **Per-issue activity tab** with diff for every field change
- **Project activity dashboard**
- **Workflow audit** for state transitions specifically
The minimum to be **competent** in activity:
1. Per-resource activity (timeline on document/task/comment thread)
2. Workspace-wide activity feed
3. Personal "what changed for me" view
4. Diff for state-mutating events
5. Filters by actor, type, date
6. Real-time delivery
7. Permission-gated visibility (you have this)
Audit log minimum:
1. Append-only, immutable
2. IP + UA for auth events (you have this)
3. Filterable by actor, action, date
4. CSV export for compliance
5. SIEM forwarding for enterprise
You have foundations 1-6 spec'd for activity (frontend reality unclear), 1-3 for audit. Missing diff rendering, personal feed, CSV export, SIEM forwarding.
### 19.3 The honest assessment
The activity surface is **architecturally exemplary**. The two-system split (activity vs audit), the actor snapshots, the event taxonomy, the privacy rules, the permission-gated visibility — these are the marks of a thoughtful design. Most platforms get this wrong.
The gaps are mostly UI depth, not architecture:
- Diff rendering for state changes
- Per-resource timelines integrated into document/task/comment views
- Personal activity feed
- CSV export for compliance audits
These are **classical "polish" features** that don't change the underlying system; they layer over it. About 4-6 weeks of focused frontend work + 1-2 weeks of backend additions for export/SIEM.
The single most-impactful gap is **the personal "what changed for me?" view**. Activity feed currently is workspace-wide ("everything in this workspace"). Users actually want a filtered version: "everything that involves me — assigned to me, mentioned me, requested my review, in my watched documents." This view is what makes activity feed a daily-use surface rather than a curiosity tab.
### 19.4 The schema additions for stronger activity
The existing schema is genuinely strong. Additions are minor:
```prisma
// Add to existing ActivityEvent model:
model ActivityEvent {
  // existing fields stay
  
  // ADD
  groupKey          String?  [@map](https://github.com/map)("group_key") [@db](https://github.com/db).VarChar(120)
  // ^ for batched display: "Sarah and 2 others edited X"
  
  diffPayload       Json?    [@map](https://github.com/map)("diff_payload") [@db](https://github.com/db).JsonB
  // ^ for state-changing events: { from: "X", to: "Y", field: "title" }
  
  importanceLevel   ImportanceLevel [@default](https://github.com/default)(normal)
  // ^ governance | normal | low
  // ^ for per-persona view tuning (Owner sees governance prioritized)
}
// Add to existing AuditLog model:
model AuditLog {
  // existing fields stay
  
  // ADD
  hashChain         String?  [@map](https://github.com/map)("hash_chain") [@db](https://github.com/db).Char(64)
  // ^ sha256(prev_hash + this_record_canonical) for tamper evidence
  
  retentionUntil    DateTime? [@map](https://github.com/map)("retention_until") [@db](https://github.com/db).Timestamptz(6)
  // ^ explicit retention end date (jurisdiction-aware)
  
  legalHold         Boolean  [@default](https://github.com/default)(false) [@map](https://github.com/map)("legal_hold")
  // ^ freeze for litigation; immune to retention purge
}
// New: per-resource activity subscriptions
model ActivitySubscription {
  id            String                   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String                   [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  userId        String                   [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  resourceType  ResourceType
  resourceId    String                   [@map](https://github.com/map)("resource_id") [@db](https://github.com/db).Uuid
  createdAt     DateTime                 [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  user          User [@relation](https://github.com/relation)(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, resourceType, resourceId])
  @@index([resourceType, resourceId])
  @@map("activity_subscriptions")
}
enum ImportanceLevel {
  governance
  normal
  low
  
  @@map("importance_level")
}
```
That's **1 new model + 1 new enum + 3 new columns on ActivityEvent + 3 new columns on AuditLog**. Modest. Each addition serves a real product or compliance need.
### 19.5 The phased plan for activity
#### Tier 1 (must-have, ~3-4 weeks)
1. **Personal activity feed** at `/activity` (cross-workspace, filtered to "involves me") — schema unchanged; new query + UI
2. **Per-resource activity timeline** integrated into document detail, task detail, comment thread (uses existing ActivityEvent table via resourceType+resourceId index)
3. **Diff rendering** for state-mutating events (uses new `diffPayload` column)
4. **Activity grouping in UI** ("Sarah and 2 others edited Document X")
5. **Activity filters frontend** (by actor, type, date range)
6. **CSV export** for activity (workspace-level for owner/admin) and audit (admin)
7. **Real-time push wiring** (Socket.IO emit on activity creation; client subscribes to `workspace:<id>` room)
#### Tier 2 (Linear/Notion-tier, ~3-4 weeks)
8. **Activity subscriptions per resource** (new `ActivitySubscription` table; "watch this document for activity" toggle)
9. **Daily/weekly activity digest** (extend existing notification digest framework to include activity)
10. **"What happened while you were away"** summary on return after N days
11. **Contribution graph** (GitHub-style green squares per user, per workspace)
12. **Activity heat map** (when in the day/week is the workspace most active?)
13. **Per-persona prioritization** (Owner sees governance events at top; uses new `importanceLevel` column)
#### Tier 3 (enterprise compliance, ~3-4 weeks)
14. **Audit log hash chain** (tamper evidence via cryptographic hash chain)
15. **Audit log SIEM forwarding** (Splunk/Datadog/webhook forwarder)
16. **Audit log retention by jurisdiction** (per-row `retentionUntil`)
17. **Legal hold flag** (freeze records during litigation)
18. **Anomaly detection** (worker job flagging unusual patterns: 50 logins from one IP / 5 min)
19. **Workspace owner audit access** (v1.1 spec'd: workspace-scoped audit log for Owners, not just Platform Admin)
**Total to "world-class activity + audit":** ~9-12 weeks across all three tiers.
### 19.6 The fork choice for activity
**Fork ZA: All three tiers (~9-12 weeks).** Best-in-class activity + enterprise-grade audit.
**Fork ZB: Tier 1 only (~3-4 weeks).** Personal feed, per-resource timeline, diff rendering, CSV export, real-time wiring. The features that make activity actually useful day-to-day.
**Fork ZC: Defer most.** Wire the basic spec into the frontend; keep features minimal. Activity feed is "nice to have" not core to your differentiation.
**Honest recommendation: Fork ZB.** Tier 1 closes the real usability gaps. Personal feed alone is a daily-use feature; per-resource timeline closes the "where did this change come from?" question. Tier 2 features (subscriptions, digests, heat maps) wait for usage data. Tier 3 (compliance) waits for enterprise customers.
### 19.7 Per-persona view tuning (you specifically asked)
Activity surfaces look different to different roles. Top platforms tune this:
#### Owner
- **Governance events prioritized** (role changes, archive/unarchive, member joins/leaves, ownership transfer attempts)
- **Sees all activity** including sensitive
- **CSV export option** for board reports / compliance reviews
- **Audit log delegate access** at workspace level (v1.1 spec'd)
#### Admin
- **Member-management events prioritized** (invitations sent, roles changed, members removed)
- **Sees all activity**
- **Bulk actions** on activity (acknowledge, dismiss noise events)
#### Manager
- **Project-progress events prioritized** (task status changes, document submissions, completion rates)
- **Sees all activity scoped to their managed resources**
- **Analytics integration** (link from activity to dashboards)
#### Member
- **Personal events prioritized** (mentions of me, things assigned to me, comments on my work)
- **Sees workspace-wide events but with "for me" filter on by default**
- **Watch toggle** per resource for opt-in deeper subscription
#### Viewer
- **Read-only events only** (cannot see governance / sensitive)
- **Sensitive events filtered out** by workspace setting (P2 feature)
- **Shorter retention visible** (e.g., 30 days vs 180)
#### Academic-specific roles
Per Part 16 (academic re-evaluation):
- **Supervisor**: review-pipeline events prioritized (submissions awaiting, overdue, approved/changes_requested decisions)
- **Co-Advisor**: same as Supervisor but limited to their assigned groups
- **Committee Member**: defense scheduling and submission events for their assigned reviews
- **Student**: their own submissions, advisor feedback, peer review assignments
- **External Examiner**: only relevant submissions during their review window
This per-persona tuning uses the new `importanceLevel` column from §19.4 plus a per-role default mapping. Each role gets a default "what to prioritize" filter that the user can override.
The implementation cost: ~1 week for the prioritization logic + ~2-3 days per persona for the role-specific filter presets. About **1.5-2 weeks total** as part of Tier 1.
### 19.8 The audit log specifics
Audit log is fundamentally different from activity feed in design intent. Worth calling out separately because the requirements differ:
**Activity feed = product feature** — drives engagement, surfaces collaboration, helps users feel connected.
**Audit log = compliance feature** — drives trust, supports forensics, enables regulatory compliance.
The schema reflects this:
- Activity has actor snapshots for graceful degradation; audit has actor email + role denormalized for cases where actor identity is uncertain.
- Activity has resource title snapshot for display; audit has request ID for correlating with HTTP logs.
- Activity has rich JSONB metadata for UI rendering; audit has IP + user agent for forensic reconstruction.
**Top platforms enforce additional rules on audit logs that you should adopt:**
1. **Append-only at DB level** — you have this conceptually; consider PostgreSQL row-level security policies that prevent UPDATE/DELETE on `audit_log` (revoke rights from app role, only system migrations can modify).
2. **Cryptographic hash chain** — each new audit record includes `sha256(previous_record_hash + current_canonical_form)`. Detect tampering.
3. **Off-system replication** — audit logs replicate to an immutable store (S3 with object lock, or a separate write-only DB). If primary DB is compromised, audit trail survives.
4. **Standard log format** — emit audit events in a format that SIEM tools parse natively (JSON Lines via stdout, OCSF schema, or Elastic Common Schema).
5. **Retention per regulatory regime** — GDPR (EU): typically 7 years for financial / 1 year for general; HIPAA (US healthcare): 6 years; SOX (US public): 7 years. Your default 365 days is too short for most enterprise customers.
6. **Legal hold workflow** — when litigation is anticipated, freeze relevant audit records from retention purge. Add the `legalHold` boolean from §19.4.
**Honest recommendation:** for v1, accept the current spec is sufficient (immutable + append-only + IP/UA captured + 365-day retention). Add Tier 3 features (hash chain, SIEM, jurisdiction-aware retention, legal hold) only when you have a paying enterprise customer who requires it. Pre-building enterprise compliance features without enterprise customers is wasted effort.
### 19.9 Cumulative roadmap (final update with all 19 surfaces)
| Surface | Recommended fork | Weeks |
|---|---|---|
| Phase 0 foundations | NestJS + Vitest + fixtures + observability + CI + DB | 4-5 |
| Phase 1 production readiness | prod env + security + integration tests + coverage | 4-6 |
| Phase 1.5 file uploads (Fork FB) | F0 + F1 | 5-6 |
| Editor depth (Fork B / professional) | §11.10 | 6-8 |
| Real templates | §11.10 follow-on | 2-3 |
| Diagrams + export | §11.10 follow-on | 3-4 |
| Tasks (Fork TC: 5 must-haves) | §12.10 | 3-5 |
| Tasks (Fork TB: Linear-lite) | §12.10 | 6-7 |
| Comments (Fork CB: Tier 1) | §13.7 | 3-4 |
| File tree (Fork FB: Tier 1) | §14.8 | 3-4 |
| Workspace (Fork WC: reactive) | §15.8 | 2 |
| Collab depth | §6.1 | 4-6 |
| Academic (Fork EB: minimum viable) | §16.5 | 6-8 |
| Professional (Fork PC: defer) | §17.A.5 | 0 |
| Files Phase F2 (virus scan, versioning) | §17.B.5 | 2 |
| Analytics (Fork XB: real backend) | §17.C.6 | 4-5 |
| Notifications (Fork NB: Tier 1) | §18.A.6 | 3-4 |
| Members (Fork MB: Tier 1) | §18.B.6 | 3-4 |
| **Activity + Audit (Fork ZB: Tier 1)** | **§19.6** | **3-4** |
| **Cumulative ("professional" everywhere)** | | **66-85 weeks** |
That's now **15-20 months** of focused engineering for a coherent v1 across all 19 surfaces investigated. World-class everywhere extends to 28-38 months.
This is the final cumulative estimate before either declaring the investigation phase over (which is what I recommend) or extending it into the few remaining surfaces (search, admin console, auth depth, billing, onboarding, mobile, a11y, performance).
### 19.10 Closing the activity re-evaluation
Activity is the surface where **architectural quality is highest and execution gap is moderate**. Unlike templates (where the spec is thin and the gap to world-class is huge) or notifications (where the spec is rich but mobile push is missing), activity has:
- Strong architectural separation (activity vs audit)
- Strong schema (snapshots, indexes, permission-gated)
- Solid spec (event taxonomy, coalescing rules, privacy rules)
- Real-time delivery defined
- Per-persona considerations documented
The implementation gap is narrower than most surfaces — Fork ZB (3-4 weeks) closes the meaningful daily-use issues. Tier 2/3 features wait for signals.
The takeaway: when you eventually build the activity feed UI, you have a **complete blueprint to execute against**. There's almost no design work left. Just implementation.
This concludes Part 19 — activity feed and audit log re-evaluation.
---
## Closing across all 19 parts of investigation
We've now investigated 19 distinct surfaces / system layers across the project:
**Foundations (Parts 1-6):**
1. NestJS migration
2. Testing methodology
3. CI / Docker / DB / Infrastructure
4. Agent rules + frontend + session memory
5. Realtime collab (Hocuspocus)
6. External session state (Notion / Obsidian)
**Surfaces (Parts 7-19):**
7. Templates + document editor
8. Tasks
9. Comments
10. File tree
11. Workspace
12. Academic submission & review
13. Professional workspace mode
14. Files & attachments
15. Analytics
16. Notifications
17. Members
18. **Activity feed & audit log**
The accumulated decision matrix is now around **95 architecture/scope choices** clustered around **15 critical ones**:
1. Phase 0 foundations acceptance (4-5 weeks before any feature work)
2. NestJS migration approach (Express + class-validator + Vitest)
3. Template + editor fork (Fork B: professional)
4. Tasks fork (TC + TB)
5. Comments fork (CB: Tier 1)
6. File tree fork (FB: Tier 1)
7. Workspace fork (WC: reactive)
8. **Academic fork (EB: differentiator, 6-8 weeks)**
9. Professional fork (PC: defer)
10. Files fork (FB Phase F0+F1)
11. Analytics fork (XB: real backend)
12. Notifications fork (NB: Tier 1)
13. Members fork (MB: Tier 1)
14. **Activity + Audit fork (ZB: Tier 1, 3-4 weeks)**
15. Rule system additions (current-state + session logs + skill cards + husky + lint, 1 week)
Plus dozens of sub-decisions per fork. All documented across Parts 1-19.
### Surfaces still uninvestigated
If you continue (which I'd advise against — see below), the most-likely-valuable remaining surfaces are:
1. **Search system** — workspace-wide search across docs/tasks/comments/files. Currently each entity has its own `search_vector` but no unified surface.
2. **Admin console** — platform-level admin (manage all workspaces, all users, system settings). Distinct from workspace settings.
3. **Auth depth** — OAuth providers beyond Google (Microsoft, Apple, GitHub), 2FA/TOTP, password policies, MFA, SSO/SAML, SCIM.
4. **Onboarding flow** — first-time-user experience, workspace-creation onboarding, invitation acceptance flow.
5. **Billing / subscription** — plans, seats, usage limits, payment, invoicing, trials.
6. **Mobile responsiveness audit** — what works on mobile, what doesn't, what's broken.
7. **Accessibility audit** — WCAG 2.1 AA conformance against the actual code.
8. **Performance audit** — bundle size, Lighthouse scores, runtime perf bottlenecks.
Each follows the same pattern as Parts 17-19: ~30 minutes of investigation producing 3-5 pages of analysis and a fork recommendation. All add detail; none change the strategic conclusions.
### My recommendation (genuinely unchanged since Part 17)
The investigations are now complete enough. Each additional report adds detail but not strategic insight. The strategic picture has been clear for 12 parts. The next thing that adds genuine value is **decisions and execution**.
**Three honest paths forward:**
1. **Make the 15 critical decisions today.** Even imperfectly — partial answers like "Phase 0 yes, NestJS Express, all forks B/EB/MB/CB/NB/ZB except academic which is the differentiator at EB" — and I write the first execution prompt. We ship Phase 0 over the next 8-11 weeks.
2. **Accept my recommended forks across the board.** I write the first execution prompt with the recommended defaults baked in. We ship.
3. **Just say "let's start shipping"** and I'll ask only for the minimum decisions needed for Phase 0 Story 1 (NestJS migration). The rest emerge from execution. This is what strong solo builders actually do in practice — they don't decide everything upfront; they decide enough to start, then iterate.
The verify-email PR taught us what compounding investigation-without-execution looks like. Another month of investigation would be a much larger version of that same pattern. Every week in research is a week of momentum lost.
This is the final closing line of the investigation phase from my side. Everything from here forward is execution.
Whenever you're ready, tell me which path you want.

---
## Part 20 — Re-Evaluation: Admin Console & Platform Administration
You called this one correctly: it's premature relative to where the project is, and the system you've spec'd is too flat. Top platforms have multi-level admin architectures that handle very different operational personas. This section explains what's missing and how to think about it.
### 20.1 Executive summary
**What you have today:**
A clean **two-level role architecture**:
- **Global role** (`USER` | `ADMIN`) on the `User` entity — distinguishes platform admin from regular users
- **Workspace role** (`OWNER`/`ADMIN`/`MANAGER`/`MEMBER`/`VIEWER`) on `WorkspaceMember` — independent of global role
The separation is correct: a Platform Admin doesn't automatically get workspace access; they can *view* all workspaces but must be added as a member to participate. This is **architecturally sound** and matches what enterprise platforms do.
The admin console implementation includes:
- Routes under `/admin/*` gated by `globalRole === "ADMIN"`
- Frontend pages: Dashboard, Users, User Detail, Workspaces, Workspace Detail, Audit Log, System Settings
- API under `/api/v1/admin/*` with consistent role enforcement
- ~12 admin-specific actions (deactivate user, reset password, revoke sessions, archive workspace, force delete, etc.)
- Typed confirmations for dangerous actions (workspace name to delete, "PROMOTE" to grant admin)
- Comprehensive audit logging on every admin action
- Principle of least privilege architecture (separate guards: `JwtAuthGuard` + `GlobalRolesGuard`)
- Basic dashboard widgets (total users, new users 7d, total workspaces, active workspaces, storage, optional error rate)
This is a **solid v1 foundation**. Better than what most platforms have at this stage.
**What you don't have:**
- **No admin role tiers** — single `ADMIN` role for everything (security issues, billing, content moderation, customer support all share the same role)
- **No admin impersonation** ("view as user" / sign in as a customer for support)
- **No platform announcements** (system-wide messages from admin to all users)
- **No customer support tools** (case tracking, support tickets, refund handling)
- **No billing administration** (plan management, invoicing, refunds, upgrade approvals)
- **No security operations center** (failed login alerts, suspicious activity dashboards, IP blocking)
- **No compliance tooling** (GDPR data export, account deletion workflow, data retention controls)
- **No platform-level analytics** beyond simple counts (cohort retention, MRR/ARR, feature adoption, conversion funnels)
- **No system health monitoring** (queue depth, latency, error rates, database health — beyond optional widgets)
- **No platform configuration management** (feature flags, kill switches, A/B test allocation)
- **No content moderation** (flag inappropriate content, takedown workflow)
- **No abuse / rate limiting management** (block IPs, throttle workspaces)
- **No DMCA / takedown workflow** (legal request intake, content removal log)
- **No data export at platform level** (compliance dump for entire platform)
- **No workspace transfer between users at admin level** (orphan workspace handling when owner deleted)
- **No bulk admin operations** (bulk user deactivation, bulk workspace archive)
- **No admin notifications** (alert admins when suspicious activity, billing failures, support tickets)
- **No staff training mode / sandbox** (test changes without affecting production data)
- **No multi-region admin segmentation** (US admin sees US users only, EU admin sees EU only)
- **No SSO admin federation** (admin role granted via corporate identity provider)
You called the right concern. This list is what separates v1 admin from enterprise admin.
### 20.2 What top platforms do — the multi-level admin architecture
This is the most important part of this re-evaluation. Top platforms don't have one "admin." They have **5-8 distinct admin personas** with separate role grants, separate UIs, separate audit trails.
#### Notion's admin architecture
Notion uses **workspace-level admin tiers** plus **enterprise-level platform admin**:
| Tier | Role | Capabilities |
|---|---|---|
| Workspace | Owner | Billing, ownership transfer, all settings |
| Workspace | Member with Admin | User management, workspace settings |
| Workspace | Member | Standard collaboration |
| Workspace | Guest | Limited per-resource access |
| Enterprise | Enterprise Admin | Cross-workspace org-level admin |
| Platform | Internal Notion staff | Customer support, abuse handling |
Critically: enterprise admin and platform admin are different things. Enterprise admin is a *paying customer's* admin (e.g., "the Acme Corp IT admin"). Platform admin is *Notion staff*.
#### Slack's admin architecture
Slack has the most sophisticated admin tiering:
| Role | Scope | What they can do |
|---|---|---|
| Workspace Owner | Workspace | All settings, billing, member management, channel admin |
| Workspace Admin | Workspace | Member management, channel settings, app approval |
| Workspace Member | Workspace | Send messages, create channels |
| Org Owner | Organization (Enterprise Grid) | All workspaces in org |
| Org Admin | Organization | Cross-workspace admin |
| Org Auditor | Organization | Read-only access for compliance |
| Custom Admin Roles (Enterprise) | Configurable | Granular permission grants |
| Slack Internal Staff | Platform | Support, security, abuse |
The **Custom Admin Roles** in Enterprise tier are the gold standard. An "IT Audit Lead" might get permissions for: view all workspaces (no edit), view audit log, export compliance reports, but NOT: deactivate users, change billing, modify channels. Granular permission grants at admin level.
#### GitHub's admin architecture
GitHub Enterprise has explicit admin role tiers:
| Role | Scope | Examples |
|---|---|---|
| Site Admin (Enterprise Server) | Entire installation | Manage users, repos, system config |
| Enterprise Owner (Enterprise Cloud) | Enterprise account | Billing, audit, SSO config |
| Organization Owner | Single org | Repos, members, settings |
| Organization Member | Single org | Standard contributor |
| Outside Collaborator | Per-repo | Limited per-repo access |
| Repository Admin | Single repo | Repo settings, branch protection |
Plus separate **GitHub internal staff roles**: Customer Support Rep, Trust & Safety, Engineering, Billing.
#### Atlassian (Confluence/Jira)
Atlassian distinguishes:
| Role | Scope |
|---|---|
| Site Admin | Atlassian Cloud site (all products) |
| Org Admin | Cross-site org level (Enterprise) |
| Product Admin (Confluence Admin, Jira Admin) | Per-product settings |
| Space Admin (Confluence) | Per-space |
| Project Admin (Jira) | Per-project |
| Atlassian Staff | Internal support and compliance |
#### The pattern — multi-level admin architecture
All major enterprise platforms converge on **3-5 layers**:
1. **Customer-facing top-tier admin** — site/org/enterprise admin that customers operate
2. **Customer-facing mid-tier admin** — workspace/space/project admin scoped narrower
3. **Custom admin roles** (granular permissions) — Enterprise feature
4. **Platform staff admin** — internal support/security/compliance/billing
5. **Compliance/audit-only role** — read-only access for regulatory needs
Your current architecture has just **two levels** (USER, ADMIN). To reach enterprise-grade, you need to add at least:
- A **billing/owner admin** distinct from technical admin
- An **audit/compliance read-only** role
- A **support/customer success** role distinct from full ADMIN
- An **internal platform staff** distinction (so eventually your team has admin access without being on the same role as customer admins)
### 20.3 The honest assessment
You correctly identified that the admin surface is **premature**. Here's why:
**Why it's premature:**
1. You have no real customers yet. Building an admin console for an empty platform is speculative.
2. The single `ADMIN` global role is fine for v1 (you = the admin).
3. Compliance features (GDPR export, retention controls, hash-chained audit) are critical for enterprise but useless for solo testing.
4. Customer support tools assume customers exist.
5. Billing admin assumes paid plans exist.
**Why it's a legitimate concern:**
1. The single `ADMIN` role won't scale. When you grow to a 5-person team, you don't want everyone seeing billing data or being able to delete workspaces.
2. The schema commitment matters now even if the UI doesn't. Adding admin role tiers post-hoc requires migration; getting it right early is cheap.
3. Compliance is a forcing function. The first enterprise customer will require GDPR, SOC2, etc. — you can't ship those in 2 weeks.
4. Admin impersonation is a customer-support necessity once you have real users with real bugs.
**The right framing:** spec the multi-level admin architecture now (so the schema and rules are in place), build only the v1 baseline (single platform admin) for actual UI, and add admin tiers + compliance features reactively as customer signals emerge.
### 20.4 The schema additions for multi-level admin
This is the single most important schema change in this re-evaluation. Get this right early; retrofitting later is painful.
```prisma
// Replace existing GlobalRole enum
enum GlobalRole {
  USER
  // ^ default user
  
  PLATFORM_ADMIN
  // ^ full platform admin (current ADMIN; rename to be explicit)
  
  PLATFORM_SUPPORT
  // ^ customer support: view users/workspaces, impersonate (with audit), limited write
  
  PLATFORM_SECURITY
  // ^ security ops: full audit log, suspicious activity dashboards, IP blocking, account lockdown
  
  PLATFORM_BILLING
  // ^ billing admin: plan management, invoicing, refunds; cannot deactivate users or modify content
  
  PLATFORM_AUDITOR
  // ^ read-only compliance: full audit log + read-only views of users/workspaces, no actions
  
  @@map("global_role")
}
// New: granular admin permission grants (for Enterprise tier later)
model AdminRoleGrant {
  id            String     [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  userId        String     [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  permission    String     [@db](https://github.com/db).VarChar(120)
  // ^ permission key like "users.deactivate", "workspaces.delete", "audit.read", "billing.refund"
  grantedById   String     [@map](https://github.com/map)("granted_by") [@db](https://github.com/db).Uuid
  reason        String?    [@db](https://github.com/db).Text
  expiresAt     DateTime?  [@map](https://github.com/map)("expires_at") [@db](https://github.com/db).Timestamptz(6)
  // ^ time-bounded grants for "just-in-time" privileged access
  revokedAt     DateTime?  [@map](https://github.com/map)("revoked_at") [@db](https://github.com/db).Timestamptz(6)
  createdAt     DateTime   [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  user          User       [@relation](https://github.com/relation)(fields: [userId], references: [id], onDelete: Cascade)
  grantedBy     User       [@relation](https://github.com/relation)("AdminRoleGrantedBy", fields: [grantedById], references: [id])
  
  @@unique([userId, permission])
  @@index([userId])
  @@index([expiresAt])
 @@map("admin_role_grants")
}
// New: admin impersonation sessions (for customer support)
model ImpersonationSession {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  adminUserId     String    @map("admin_user_id") @db.Uuid
  impersonatedUserId String @map("impersonated_user_id") @db.Uuid
  reason          String    @db.Text
  ticketId        String?   @map("ticket_id") @db.VarChar(60)
  // ^ link to customer support ticket
  startedAt       DateTime  @default(now()) @map("started_at") @db.Timestamptz(6)
  endedAt         DateTime? @map("ended_at") @db.Timestamptz(6)
  ipAddress       String?   @map("ip_address") @db.VarChar(64)
  userAgent       String?   @map("user_agent") @db.Text
  
  adminUser       User      @relation("ImpersonationAdmin", fields: [adminUserId], references: [id])
  impersonatedUser User     @relation("ImpersonationTarget", fields: [impersonatedUserId], references: [id])
  
  @@index([adminUserId])
  @@index([impersonatedUserId])
  @@map("impersonation_sessions")
}
// New: platform announcements (system-wide messages from admin)
model PlatformAnnouncement {
  id           String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  authorId     String                 @map("author_id") @db.Uuid
  title        String                 @db.VarChar(200)
  body         String                 @db.Text
  severity     AnnouncementSeverity   @default(info)
  // ^ info | warning | critical | maintenance
  audience     AnnouncementAudience   @default(all_users)
  // ^ all_users | platform_admins | specific_workspaces | specific_role
  audienceConfig Json?                @map("audience_config") @db.JsonB
  // ^ for specific_workspaces: { workspaceIds: [...] }
  startsAt     DateTime               @map("starts_at") @db.Timestamptz(6)
  endsAt       DateTime?              @map("ends_at") @db.Timestamptz(6)
  // ^ optional expiry for time-boxed banners
  publishedAt  DateTime?              @map("published_at") @db.Timestamptz(6)
  // ^ null = draft, non-null = live
  
  author       User                   @relation(fields: [authorId], references: [id])
  
  @@index([startsAt, endsAt])
  @@map("platform_announcements")
}
// New: support tickets / customer success
model SupportTicket {
  id            String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  reporterId    String?        @map("reporter_id") @db.Uuid
  // ^ null if reported by anonymous user (rare)
  workspaceId   String?        @map("workspace_id") @db.Uuid
  // ^ optional: ticket about a specific workspace
  category      TicketCategory
  priority      TicketPriority @default(normal)
  status        TicketStatus   @default(open)
  subject       String         @db.VarChar(200)
  description   String         @db.Text
  assigneeId    String?        @map("assignee_id") @db.Uuid
  // ^ assigned to which platform_support admin
  createdAt     DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  resolvedAt    DateTime?      @map("resolved_at") @db.Timestamptz(6)
  
  reporter      User?          @relation("TicketReporter", fields: [reporterId], references: [id])
  assignee      User?          @relation("TicketAssignee", fields: [assigneeId], references: [id])
  
  @@index([status, priority])
  @@map("support_tickets")
}
// New: account deletion / GDPR workflow
model DataExportRequest {
  id            String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String              @map("user_id") @db.Uuid
  type          DataExportType
  // ^ user_data | workspace_data | account_deletion
  status        DataExportStatus    @default(requested)
  // ^ requested | in_progress | ready | failed | downloaded | expired
  outputFileId  String?             @map("output_file_id") @db.Uuid
  expiresAt     DateTime?           @map("expires_at") @db.Timestamptz(6)
  // ^ download link expiry
  requestedAt   DateTime            @default(now()) @map("requested_at") @db.Timestamptz(6)
  completedAt   DateTime?           @map("completed_at") @db.Timestamptz(6)
  
  user          User                @relation(fields: [userId], references: [id])
  outputFile    File?               @relation(fields: [outputFileId], references: [id])
  
  @@index([userId, status])
  @@map("data_export_requests")
}
// New enums
enum AnnouncementSeverity {
  info
  warning
  critical
  maintenance
  
  @@map("announcement_severity")
}
enum AnnouncementAudience {
  all_users
  platform_admins
  specific_workspaces
  specific_role
  
  @@map("announcement_audience")
}
enum TicketCategory {
  bug
  feature_request
  billing
  abuse
  data_request
  general
  
  @@map("ticket_category")
}
enum TicketPriority {
  urgent
  high
  normal
  low
  
  @@map("ticket_priority")
}
enum TicketStatus {
  open
  in_progress
  waiting_on_customer
  resolved
  closed
  
  @@map("ticket_status")
}
enum DataExportType {
  user_data
  workspace_data
  account_deletion
  
  @@map("data_export_type")
}
enum DataExportStatus {
  requested
  in_progress
  ready
  failed
  downloaded
  expired
  
  @@map("data_export_status")
}
```
That's **5 new models + 6 new enums + the GlobalRole expansion**. Substantial, but each addition serves a real operational need.
The two most important parts of this schema change:
1. **The `GlobalRole` enum expansion** with `PLATFORM_SUPPORT`, `PLATFORM_SECURITY`, `PLATFORM_BILLING`, `PLATFORM_AUDITOR` — this is the multi-level admin architecture you correctly identified as missing. Without this, your eventual support team has the same destructive privileges as the security team, which violates separation of duties.
2. **The `AdminRoleGrant` model** — granular permission grants that supplement the role enum. Eventually a "Senior Support Engineer" might need to deactivate users (normally a `PLATFORM_ADMIN` action). With grants, you can give that specific permission to a specific support engineer, time-bounded, audit-logged, without making them full platform admin.
### 20.5 The phased plan for admin
#### Tier 1 (must-have for v1, ~1-2 weeks)
This is what you actually need before launching with real users:
1. **Rename `ADMIN` → `PLATFORM_ADMIN`** — clarity for future role expansion (1 day)
2. **Admin impersonation** with mandatory ticket reference + duration limit + audit (~2-3 days). Single most-needed support feature.
3. **Account deletion / GDPR data export workflow** (~3-4 days). Legal requirement for EU users.
4. **Admin notifications** — alert admins on platform anomalies (failed login bursts, billing failures, support ticket SLA breaches) (~2 days)
#### Tier 2 (Slack/Linear-tier, ~3-4 weeks)
Most important pre-enterprise admin features:
5. **Multi-tier admin roles** — `PLATFORM_SUPPORT`, `PLATFORM_SECURITY`, `PLATFORM_BILLING`, `PLATFORM_AUDITOR`. Implement role-checking middleware updates (~1 week).
6. **Platform announcements** — system-wide banners + targeted messages (~3-4 days)
7. **Support ticketing** — basic ticket lifecycle, assignment, resolution (~1-2 weeks)
8. **Bulk admin operations** — bulk user deactivation, bulk workspace archive, with confirmation gates (~2-3 days)
9. **Platform-level analytics** — DAU/WAU/MAU, MRR/ARR if billing exists, retention cohorts, feature adoption (~1 week)
#### Tier 3 (enterprise, ~4-6 weeks)
For when you sell to enterprise customers:
10. **Granular admin role grants** (`AdminRoleGrant` model) — just-in-time privileged access (~1 week)
11. **Custom admin role definitions** — let enterprise customers create their own admin roles with selected permissions (~1-2 weeks)
12. **SOC2 compliance toolkit** — audit log hash chain, retention by jurisdiction, legal hold, SIEM forwarding (overlap with Part 19) (~1-2 weeks)
13. **Content moderation** — flag inappropriate content, takedown workflow, abuse handling (~1 week)
14. **DMCA workflow** — legal request intake, content removal log (~3-5 days)
15. **Admin training mode / sandbox** — test changes without affecting production (~1 week)
16. **Multi-region admin segmentation** (if multi-region deployment exists) (~1 week)
#### Tier 4 (massive scale, defer indefinitely)
- Federated admin via corporate SSO
- Real-time platform-health observability (PagerDuty integration)
- Advanced abuse detection (ML-based suspicious activity)
- White-label admin (resellers)
- Multi-tenant org management
These are needed only after you have many enterprise customers.
**Total to "world-class admin":** ~8-12 weeks across Tiers 1-3. Tier 4 indefinite.
### 20.6 The fork choice for admin
**Fork QA: Tiers 1-3 (~8-12 weeks).** Best-in-class admin including enterprise features.
**Fork QB: Tiers 1-2 (~5-7 weeks).** Multi-tier admin + impersonation + GDPR + announcements + tickets + bulk ops + platform analytics. Solid pre-enterprise admin.
**Fork QC: Tier 1 only (~1-2 weeks).** Just the v1 essentials: rename ADMIN, add impersonation, GDPR workflow, admin alerts. Defer everything else until customer demand.
**Fork QD: Defer almost entirely (~3 days).** Keep current admin spec. Add only impersonation as a single PR. The most aggressive "build later" choice.
**Honest recommendation: Fork QC.** Here's why:
You correctly observed this is premature. The schema additions in §20.4 are the most important change — getting the role architecture right early is cheap; retrofitting later is expensive. But the *UI* for those tiers can wait. So:
1. **Now (Fork QC, ~1-2 weeks):** Rename `ADMIN` → `PLATFORM_ADMIN`. Add impersonation flow. Add GDPR data-export workflow (legal need). Add admin notifications. Schema-spec the multi-tier admin architecture *but don't build the UI for the new tiers yet*.
2. **When you have first paying customer support load (~later):** Build Fork QB delta (~3-4 weeks). Multi-tier admin UI. Support ticketing. Platform announcements.
3. **When you have first enterprise customer (~much later):** Build Fork QA delta (~3-4 weeks). Custom admin roles. SOC2 toolkit. Content moderation.
This gives you the schema foundation now (cheap to commit to) without burning bandwidth on UI features that have no users yet.
### 20.7 The compliance dimension you specifically need to think about
You said this surface is premature. It is, but **two compliance items aren't optional past your first paying customer:**
#### GDPR / data subject rights (EU, applies globally if you have any EU users)
Three legal requirements:
1. **Right to access** — user can download all their data
2. **Right to deletion** — user can request account+data deletion
3. **Right to rectification** — user can correct their data
Your current spec covers part 3 (users edit their profile) but not 1 and 2. The `DataExportRequest` model from §20.4 handles parts 1 and 2.
Time to implement: ~3-4 days. Don't ship to EU users without it.
#### CCPA (California)
Mostly overlaps with GDPR but adds:
- Right to know what personal info is collected and sold
- Right to opt-out of "sale" of data (not selling = trivial compliance)
- Right to non-discrimination (cannot deny service for exercising rights)
If you've covered GDPR data export, CCPA compliance is mostly a privacy-policy update.
#### What about HIPAA / SOC2 / ISO 27001?
Don't pre-build. These come up only when:
- HIPAA: you sell to US healthcare. Don't build until that customer signs.
- SOC2: you sell to enterprises. They will tell you what's required during procurement.
- ISO 27001: largely overlaps with SOC2.
The schema additions in §20.4 (especially `AuditLog` hash chain from Part 19) are a foundation. The full compliance toolkit is months of work — only do it when revenue is on the line.
### 20.8 Admin impersonation — the most common feature you're missing
Top platforms have a clear pattern for support impersonation:
1. **Required justification.** No "view as user" without typed reason and (preferably) ticket ID linkage.
2. **Time-bounded session.** Default 30 minutes; extend with re-justification.
3. **Banner during session.** UI shows "You are viewing as [user]" with prominent exit.
4. **Audit on every action.** Each request during impersonation is dual-logged: actor=admin, on-behalf-of=user.
5. **Cannot impersonate admins.** Privilege escalation defense.
6. **Cannot impersonate billing actions.** Even with impersonation, billing changes require explicit re-auth as the user.
7. **Post-session summary.** What was done during the session, sent to user as notification.
The `ImpersonationSession` schema from §20.4 supports all of these. Implementation is ~2-3 days.
This is the single most-impactful Tier 1 admin feature. Without it, every customer-support interaction requires the user to share their screen or send screenshots. With it, support resolves issues 5-10x faster.
### 20.9 Per-persona admin design (you specifically asked)
Here's how the multi-tier admin architecture maps to operational personas. This is what each role *should* be able to do:
#### `PLATFORM_ADMIN` (super admin)
- All capabilities
- Can grant/revoke other admin roles
- Can perform irreversible actions (force delete workspace, hard delete user)
- Restrict to 2-5 trusted humans max in any organization
- Required: 2FA, audit on every action
#### `PLATFORM_SUPPORT` (customer support)
- View user accounts (read)
- View workspace metadata (read)
- Impersonate users (with audit + ticket reference)
- Resend verification emails
- Reset passwords (with email confirmation, not direct)
- Cannot deactivate users
- Cannot delete workspaces
- Cannot change billing
- Required: linked to support ticket
#### `PLATFORM_SECURITY` (security operations)
- Full audit log access
- Suspicious activity dashboards
- IP blocking / unblocking
- Force-revoke all sessions for a user
- Account lockdown (deactivate + revoke all sessions + email user)
- View security-sensitive metadata (login attempts, IP history)
- Cannot view content (documents, comments)
- Cannot change billing
- Required: 2FA, separate device/role from regular admin
#### `PLATFORM_BILLING` (financial admin)
- Plan management (upgrade/downgrade workspaces)
- Invoice access
- Refund processing
- Trial extension
- Coupon/discount creation
- Cannot view user content
- Cannot deactivate users
- Cannot view audit log (except billing-scoped)
- Required: separate financial controls
#### `PLATFORM_AUDITOR` (compliance read-only)
- Full read access to audit log
- Read-only views of users and workspaces
- Export compliance reports (CSV)
- Cannot perform any write action
- Cannot impersonate
- Required: external auditor access pattern
These five tiers cover ~95% of operational needs. Custom admin roles (Tier 3) cover the last 5% for enterprise customers who want fine-grained permissions.
### 20.10 What top platforms get wrong (your opportunity)
Common admin-console failures across the industry:
1. **Single ADMIN role conflating everything.** Your support team has the same DB-delete privilege as your security team. Clean separation is rare and a real differentiator.
2. **No just-in-time privilege grants.** Most platforms have static admin roles. Top-tier security adds time-bounded grants ("you have user-deactivation rights for the next 4 hours, then it auto-revokes"). The `AdminRoleGrant.expiresAt` field from §20.4 enables this.
3. **No audit trail on read-only admin actions.** Most platforms only audit writes. Top-tier audit also logs reads (who viewed what user data, who searched for what). This is a SOC2 requirement.
4. **Impersonation without justification or audit.** Many platforms allow "log in as user" without ticket reference or session bounds. Major compliance failure.
5. **Mixing platform admin and customer admin in the same UI.** Confusing, leads to operational mistakes. Yours separates them via `/admin/*` routing — good.
6. **No graceful workspace owner handoff.** When platform admin deactivates a workspace owner, what happens to the workspace? Top platforms have explicit "transfer or archive" prompts. Yours doesn't yet.
7. **No "break glass" emergency access.** When something is on fire, admins need to escalate privileges fast. Top platforms have explicit emergency-access protocols with auto-rollback. The `AdminRoleGrant.expiresAt` enables this.
CollabSphere can be the platform that **separates admin tiers cleanly from day one**. Most competitors retrofit this badly when they hit enterprise customers; you can build it right initially.
### 20.11 Cumulative roadmap (final update with all 20 surfaces)
| Surface | Recommended fork | Weeks |
|---|---|---|
| Phase 0 foundations | NestJS + Vitest + fixtures + observability + CI + DB | 4-5 |
| Phase 1 production readiness | prod env + security + integration tests + coverage | 4-6 |
| Phase 1.5 file uploads (Fork FB) | F0 + F1 | 5-6 |
| Editor depth (Fork B / professional) | §11.10 | 6-8 |
| Real templates | §11.10 follow-on | 2-3 |
| Diagrams + export | §11.10 follow-on | 3-4 |
| Tasks (Fork TC: 5 must-haves) | §12.10 | 3-5 |
| Tasks (Fork TB: Linear-lite) | §12.10 | 6-7 |
| Comments (Fork CB: Tier 1) | §13.7 | 3-4 |
| File tree (Fork FB: Tier 1) | §14.8 | 3-4 |
| Workspace (Fork WC: reactive) | §15.8 | 2 |
| Collab depth | §6.1 | 4-6 |
| Academic (Fork EB: minimum viable) | §16.5 | 6-8 |
| Professional (Fork PC: defer) | §17.A.5 | 0 |
| Files Phase F2 (virus scan, versioning) | §17.B.5 | 2 |
| Analytics (Fork XB: real backend) | §17.C.6 | 4-5 |
| Notifications (Fork NB: Tier 1) | §18.A.6 | 3-4 |
| Members (Fork MB: Tier 1) | §18.B.6 | 3-4 |
| Activity + Audit (Fork ZB: Tier 1) | §19.6 | 3-4 |
| **Admin (Fork QC: schema + impersonation + GDPR)** | **§20.6** | **1-2** |
| **Cumulative ("professional" everywhere)** | | **67-87 weeks** |
That's now **15-20 months** of focused engineering for a coherent v1 across all 20 surfaces investigated. World-class everywhere extends to 28-38 months.
This is the definitive cumulative estimate.
### 20.12 Closing the admin re-evaluation
Admin console is **the surface where your instinct was correct: it's premature**. The current spec is solid for v1. The critical gap is the *role architecture* — single `ADMIN` won't scale past 5-10 trusted humans.
The right move:
1. **Spec the multi-tier admin architecture now** (this document) — locks in the schema commitment cheaply
2. **Implement Fork QC (~1-2 weeks)** — rename `ADMIN` to `PLATFORM_ADMIN`, add impersonation, add GDPR workflow, add admin notifications. Schema migration ready for future tiers.
3. **Defer Fork QB/QA UI work** — until paying customer support load demands them.
This pattern (commit to schema architecture early, defer UI implementation) is the right approach for any "premature but inevitable" surface. Schema commitments are cheap to make and expensive to retrofit; UI commitments are cheap to retrofit and expensive to maintain. So front-load the schema, defer the UI.
This concludes Part 20 — admin console re-evaluation.
---
## Closing across all 20 parts of investigation
We've now investigated 20 distinct surfaces / system layers across the project:
**Foundations (Parts 1-6):**
1. NestJS migration
2. Testing methodology
3. CI / Docker / DB / Infrastructure
4. Agent rules + frontend + session memory
5. Realtime collab (Hocuspocus)
6. External session state (Notion / Obsidian)
**Surfaces (Parts 7-20):**
7. Templates + document editor
8. Tasks
9. Comments
10. File tree
11. Workspace
12. Academic submission & review
13. Professional workspace mode
14. Files & attachments
15. Analytics
16. Notifications
17. Members
18. Activity feed & audit log
19. **Admin console**
The accumulated decision matrix is now around **100 architecture/scope choices** clustered around **16 critical ones**:
1. Phase 0 foundations acceptance (4-5 weeks before any feature work)
2. NestJS migration approach (Express + class-validator + Vitest)
3. Template + editor fork (Fork B: professional)
4. Tasks fork (TC + TB)
5. Comments fork (CB: Tier 1)
6. File tree fork (FB: Tier 1)
7. Workspace fork (WC: reactive)
8. **Academic fork (EB: differentiator)**
9. Professional fork (PC: defer)
10. Files fork (FB Phase F0+F1)
11. Analytics fork (XB: real backend)
12. Notifications fork (NB: Tier 1)
13. Members fork (MB: Tier 1)
14. Activity + Audit fork (ZB: Tier 1)
15. **Admin fork (QC: schema + impersonation + GDPR, 1-2 weeks)**
16. Rule system additions (current-state + session logs + skill cards + husky + lint, 1 week)
Plus dozens of sub-decisions per fork. All documented across Parts 1-20.
### Surfaces still uninvestigated
If you continue (which I still advise against — see below), the most-likely-valuable remaining surfaces are:
1. **Search system** — workspace-wide search across docs/tasks/comments/files. Currently each entity has its own `search_vector` but no unified surface. ~30 min to investigate.
2. **Auth depth** — OAuth providers beyond Google (Microsoft, Apple, GitHub), 2FA/TOTP, password policies, MFA, SSO/SAML, SCIM. ~30 min.
3. **Onboarding flow** — first-time-user experience, workspace-creation onboarding, invitation acceptance flow. ~30 min.
4. **Billing / subscription** — plans, seats, usage limits, payment, invoicing, trials. ~45 min (more research needed since no spec exists yet).
5. **Mobile responsiveness audit** — what works on mobile, what doesn't, what's broken. ~30 min.
6. **Accessibility audit** — WCAG 2.1 AA conformance against the actual code. ~30 min.
7. **Performance audit** — bundle size, Lighthouse scores, runtime perf bottlenecks. ~30 min.
Each follows the same pattern as Parts 17-20: short investigation producing a fork recommendation. All add detail; **none change the strategic conclusions** I've laid out across 20 parts.
### My recommendation (genuinely, finally, unchanged since Part 17)
The investigations are complete. Each additional report adds detail but no new strategic insight. The strategic picture has been clear for at least 12 parts. The next thing that adds genuine value is **decisions and execution**.
I've now said this in the closing sections of Parts 17, 18, 19, and 20. Each time you've asked me to investigate one more surface. I've done it because each surface is a real and reasonable question. But the pattern is now clear: the closing recommendation hasn't changed across 4 successive iterations because the underlying truth hasn't changed.
Let me say this as directly as I can:
**You have spent ~6+ hours on investigation. You have a 100-decision matrix. You have 16 critical forks with strong recommendations. You have a 67-87 week roadmap. You have differentiation strategy clarity (academic + doc↔task linking + collaborative writing).**
**You haven't shipped any code as a result of any of this investigation yet.**
That's the honest read. Not a criticism — investigation is genuinely valuable, and yours has been thorough. But the value of investigation is realized only when it converts to execution. Each additional investigation report has diminishing strategic value because the strategic picture is already complete. The marginal hour of investigation produces less change to the plan than the marginal hour of execution would.
The verify-email PR taught us what compounding inaction looks like. Twenty parts of investigation without code shipping is a much larger version of that same pattern, even though each individual report feels productive.
### Three honest paths from here, ranked by my recommendation
**Path 1 (strongest recommendation): Just say "let's start shipping."**
Reply with two words: *let's ship*. I'll ask only the minimum decisions needed for Phase 0 Story 1 (NestJS migration). Probably 3-5 quick questions. Then I write the execution prompt. We ship.
This is what strong solo builders actually do. They don't decide everything upfront. They decide enough to start, then learn from execution. The 16 critical decisions don't all need to be made today; they need to be revisited as each surface comes up. Phase 0 (foundations) doesn't depend on most of them anyway.
**Path 2: Make 5-6 decisions today, ship.**
Reply with brief answers to the 5-6 most pressing decisions:
- Phase 0 yes/no (yes recommended)
- NestJS migration approach (Express + class-validator + Vitest recommended)
- Template fork (B recommended)
- Tasks fork (TC first, then TB)
- Academic fork (EB strongly recommended — your differentiator)
- Rule-system additions yes/no (yes recommended, 1 week)
That's enough for me to write the first 3-4 execution prompts. Other decisions can wait until those surfaces come up.
**Path 3 (NOT recommended): Investigate one more surface.**
If you genuinely want one more, pick from the list above (search, auth, onboarding, billing, mobile, a11y, performance). I'll do it. But I'd ask you to consider whether *another* report is what's blocking shipping, or whether deciding-and-shipping is.
### The honest meta-point
I've been repeating this closing recommendation in the last 4-5 reports. You've asked for one more investigation each time. That's a real pattern worth naming.
Possible reasons:
- Genuinely needed information that I haven't surfaced (legitimate; pick Path 3)
- Unfamiliarity / discomfort with the next step (legitimate; Path 1 helps)
- Investigation feels safer than execution (a real solo-builder trap)
- Each new report unlocks "one more thing to think about" before commitment
If it's the last reason, more reports will keep extending the cycle. The next investigation will reveal a new gap, which will make you want to investigate the *next* surface, etc. This isn't your fault; it's the natural failure mode of comprehensive planning. The escape is to commit to a smaller-than-you-feel-comfortable-with starting scope and let execution teach you the rest.
This is my final closing recommendation across all 20 parts of investigation. I won't repeat it again — I'll defer to whatever you choose next. But I want it stated clearly one final time:
> **Stop investigating. Decide. Ship.**
You've earned the clarity. Use it.
Whichever path you pick — including Path 3 if you genuinely need one more report — tell me, and I'll proceed. But I'd ask you to genuinely consider Path 1 first. Two words: "let's ship." And we start.
---
## Part 21 — Re-Evaluation: Search System
### 21.1 Executive summary
**What you have today:**
- **PostgreSQL full-text search** via `tsvector` columns on `documents` and `tasks` (no Elasticsearch / no external search service)
- Weighted indexing: title at weight A, body at weight B (correct standard practice)
- GIN indexes on both search vectors for sub-millisecond lookups
- Three search modes specified:
  - **Workspace-scoped** (default inside a workspace) — < 500ms target
  - **Global** (all user's workspaces) — < 800ms target
  - **Admin global** (platform admin only) — under `/admin/*`
- Single REST endpoint: `GET /api/v1/search` with `q`, `scope`, `workspaceId`, `types`, `page`, `pageSize` parameters
- Permission-aware: workspace-scoped validates membership; global joins `workspace_members`; admin under admin guard
- Command palette (Cmd+K) with 200ms debounce, search across documents/tasks/members in current workspace, prefix `>` for global commands, max 5 results per group, keyboard navigation
- Search analytics with privacy: `search.performed` and `search.result_clicked` events, **raw queries never logged** (only sha256 + length + scope)
- Update strategy: `search_vector` refreshed when title changes or CRDT content persists (`onStoreDocument` hook); eventual consistency accepted
- `websearch_to_tsquery` recommended over `plainto_tsquery` for user-friendly syntax (quoted phrases)
- Pagination: 25 per page, max 100
- Rich result types: documents (title, snippet, workspace, last updated), tasks (title, status, assignee, workspace, due date)
**This is the most architecturally mature surface relative to its scope.** PostgreSQL FTS is exactly the right choice for v1 — Elasticsearch would be over-engineering. The weighting strategy is correct. The privacy approach (hash queries, never log raw) is professional. The three search modes with strict isolation are clean.
**What you don't have:**
- **No comments search** in v1 (planned v1.1+)
- **No file search** (filename or content)
- **No member directory search** (find user across workspaces)
- **No workspace search** (find workspace by name across user's memberships — Cmd+K touches this but no dedicated)
- **No code/snippet search** in documents
- **No semantic / vector search** (no embedding-based "find similar content")
- **No fuzzy / typo tolerance** (`Postgres FTS` is exact-token matching, not fuzzy)
- **No saved searches / smart filters**
- **No search history per user**
- **No search shortcuts / aliases** (`@me`, `assignee:me`, `status:open` style operators)
- **No advanced query syntax** (Boolean AND/OR, field-scoped queries beyond what `websearch_to_tsquery` provides)
- **No search suggestions / autocomplete** (Slack-style "did you mean?")
- **No search highlighting in result snippets** (returning the matched fragment with `<mark>` highlight)
- **No recency boost** (P2 in spec)
- **No popularity / engagement boost**
- **No filter by date range** (mentioned but unspec'd)
- **No filter by author** (mentioned but unspec'd)
- **No filter by label/tag** (mentioned as P2)
- **No filter by status** for tasks (in UI, but not in API contract spec)
- **No "search this folder" / scoped search within document tree**
- **No "what changed since last visit"** search
- **No multi-language search** (PostgreSQL FTS uses 'english' config — no Spanish, Chinese, etc.)
- **No search analytics dashboard** for admins (top queries, no-results queries)
- **No search index warmup / pre-population** (cold queries are slow on first hit)
- **No federated search** (combining multiple data sources beyond docs/tasks)
- **No PDF / file content search** (depends on file system from Part 17.B)
- **No image / OCR search**
- **No semantic chunking for long documents** (a 50-page doc has one search vector; no per-section relevance)
### 21.2 What top platforms do
#### Notion search
- **Universal search** — pages, databases, comments, files, all content types
- **Quick switcher** (Cmd+K) for navigation + content
- **Filters**: created by, last edited by, in workspace, in space
- **No saved searches** (mild gap)
- **No advanced operators** but has natural language support
- **Recent searches** in dropdown
- **Highlighted snippets** showing matched text
- Built on Elasticsearch under the hood
#### Slack search
- **Modifiers**: `from:@user`, `in:#channel`, `before:date`, `after:date`, `has:link`, `has:reaction`, etc.
- **Saved searches** with custom names
- **Search history**
- **AI search summary** (Slack AI synthesizes search results)
- **Highlighted snippets** with surrounding context
- **Filter sidebar** (date, channel, person, file type)
- **Recent activity** as fallback when no query
#### Linear search
- **Issue search** with extensive filter syntax
- **Saved views = saved searches** (filter+sort+group combo, named, shareable)
- **Cmd+K everywhere** for navigation + actions
- **Smart filters** ("issues assigned to me, due this week, not done")
- **Boolean operators** in advanced view
#### GitHub search
- **Most sophisticated** search syntax in the dev space
- Field operators: `is:open`, `is:pr`, `author:`, `assignee:`, `label:`, `created:>=2024-01-01`, `language:python`, etc.
- **Code search** with semantic awareness (function names, symbols)
- **Search across repos**, organizations, the entire site
- **Saved searches** with notifications when new matches appear
- **Issue templates** indexed for autocomplete
#### Confluence search
- **Spaces, pages, attachments, comments** all indexed
- **Filters**: contributor, modified date, label, space
- **Smart suggestions** based on recently viewed
- **Page-level search** (Ctrl+F within long page) plus space-level
#### Google Drive
- **OCR for images and PDFs** — text inside scanned documents searchable
- **File type filter**, modified date, owner, shared with
- **Smart suggestions** based on usage patterns
- **Voice search** on mobile
The **minimum to be competent** for a workspace platform:
1. Documents + tasks search (you have this)
2. Comments search
3. Member search
4. Filters by author, date, status
5. Highlighted snippets in results
6. Permission-aware (you have this)
7. Sub-second latency (you spec this)
8. Cmd+K for navigation + search (you have this)
You have 4 of 8. Missing: comments, members, filters beyond type/scope, snippet highlighting.
### 21.3 The honest assessment
The search surface is **architecturally excellent for v1 scope** but **functionally narrow**. Here's the breakdown:
**What's right:**
- PostgreSQL FTS choice is correct for your scale (don't add Elasticsearch unless you reach 100k+ users)
- Weighted indexing is standard practice
- Three-mode separation (workspace / global / admin) is clean
- Privacy-first (hash queries) is professional
- Single endpoint with mode parameter is API-elegant
- Cmd+K command palette pattern is universal expectation
**What's narrow:**
- Only documents and tasks are searchable. No comments, no files, no members.
- Filters are barely specified beyond `type` and `scope`.
- No snippet highlighting — results show full title without "showing matched fragment with surrounding context."
- No search history or saved searches.
- No advanced operators (modern users expect `from:@sarah`, `before:2024`, etc.).
- Index updates only on document save; no real-time index refresh during active editing.
**The single biggest gap:** **filter parameters in the API are barely specified**. The spec mentions filters by author, date, status, but the API contract documents only `q`, `scope`, `workspaceId`, `types`, `page`, `pageSize`. The UI surface mentions filters but the backend isn't equipped to serve them. This is a coordinate-mismatch between frontend desire and backend reality.
The second biggest gap: **comments aren't searchable in v1**. Most user search queries in collaboration platforms are looking for *something someone said*, not *the title of a document*. Excluding comments from search is a major usability gap.
### 21.4 The schema additions for richer search
Most additions are columns, not tables. The existing schema is sound; we extend it.
```prisma
// Add search_vector to comments (currently missing)
model Comment {
  // existing fields stay
  
  // ADD
  searchVector  Unsupported("tsvector")? [@map](https://github.com/map)("search_vector")
}
// Add search_vector to files (depends on file content extraction)
model File {
  // existing fields stay
  
  // ADD (when files land — Part 17.B)
  searchVector       Unsupported("tsvector")? [@map](https://github.com/map)("search_vector")
  // ^ derived from filename, extracted text content (PDF text, OCR for images)
  
  extractedTextLength Int?  [@map](https://github.com/map)("extracted_text_length")
  // ^ for "skip indexing files > N MB" guard
}
// New: saved searches per user
model SavedSearch {
  id            String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  workspaceId   String?  [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  // ^ null = global saved search across all user workspaces
  ownerId       String   [@map](https://github.com/map)("owner_id") [@db](https://github.com/db).Uuid
  name          String   [@db](https://github.com/db).VarChar(120)
  query         String   [@db](https://github.com/db).Text
  filters       Json     [@db](https://github.com/db).JsonB
  // ^ { types, status, author, dateRange, labels, ... }
  visibility    SearchVisibility [@default](https://github.com/default)(private)
  // ^ private | workspace
  notifyOnMatch Boolean  [@default](https://github.com/default)(false) [@map](https://github.com/map)("notify_on_match")
  // ^ GitHub-style: notify when new content matches saved search
  createdAt     DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("created_at") [@db](https://github.com/db).Timestamptz(6)
  
  owner         User     [@relation](https://github.com/relation)(fields: [ownerId], references: [id], onDelete: Cascade)
  
  @@map("saved_searches")
}
// New: search history per user
model SearchHistory {
  id            String   [@id](https://github.com/id) [@default](https://github.com/default)(dbgenerated("gen_random_uuid()")) [@db](https://github.com/db).Uuid
  userId        String   [@map](https://github.com/map)("user_id") [@db](https://github.com/db).Uuid
  workspaceId   String?  [@map](https://github.com/map)("workspace_id") [@db](https://github.com/db).Uuid
  // ^ null = global search
  queryHash     String   [@map](https://github.com/map)("query_hash") [@db](https://github.com/db).Char(64)
  // ^ never store raw query
  scope         String   [@db](https://github.com/db).VarChar(20)
  resultCount   Int      [@map](https://github.com/map)("result_count")
  resultClicked Boolean  [@default](https://github.com/default)(false) [@map](https://github.com/map)("result_clicked")
  searchedAt    DateTime [@default](https://github.com/default)(now()) [@map](https://github.com/map)("searched_at") [@db](https://github.com/db).Timestamptz(6)
  
  user          User     [@relation](https://github.com/relation)(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, searchedAt(sort: Desc)])
  @@index([workspaceId, queryHash])
  @@map("search_history")
}
enum SearchVisibility {
  private
  workspace
  
  @@map("search_visibility")
}
```
That's **1 new model + 1 new enum + 2 columns added to existing `Comment` and `File` models + 1 search history table**. Modest. Each addition serves a real product need.
### 21.5 The phased plan for search
#### Tier 1 (must-have, ~2-3 weeks)
1. **Comments search** — add `search_vector` to comments table; include in unified search endpoint (~3-4 days)
2. **Snippet highlighting in results** — `ts_headline()` to return matched fragment with `<mark>` markup (~2 days)
3. **Filter parameters in API** — `author`, `dateFrom`, `dateTo`, `status`, `labels` query params with proper indexing (~3-4 days)
4. **Member search** — separate endpoint or unified with type=members (~2 days)
5. **Search highlighting in UI** — render matched fragments correctly in result cards (~2 days)
6. **Search history dropdown** — show recent queries when user opens search (`SearchHistory` model) (~1-2 days)
7. **Recency boost** — currently P2 in spec; promote to P0 (~1 day, just a query change)
#### Tier 2 (Slack/Linear-tier, ~3-4 weeks)
8. **Saved searches** with optional notify-on-match (`SavedSearch` model) (~1 week)
9. **Advanced query operators** — `author:`, `in:`, `before:`, `after:`, `status:`, `label:` (~1 week)
10. **Workspace search** (find a workspace by name across user's memberships) (~2-3 days)
11. **Search "across all workspaces" toggle** in UI (already specified, just needs frontend) (~2-3 days)
12. **No-results suggestions** — "Did you mean?" via PostgreSQL `pg_trgm` similarity (~3-4 days)
13. **Search analytics dashboard** for admins — top queries, no-results queries, click-through rate (~3-4 days)
#### Tier 3 (advanced, ~3-4 weeks)
14. **File content search** — depends on file uploads landing; PDF text extraction + OCR (~1 week + ongoing OCR pipeline)
15. **Multi-language search** — store `language` per document, route to appropriate FTS config (~3-4 days)
16. **Smart filters / preset views** — "my recent edits", "assigned to me, due this week" (~3-4 days)
17. **Search suggestions / autocomplete** — typeahead based on indexed content (~1 week)
18. **Federated search** — combine multiple data sources beyond Postgres (~varies)
#### Tier 4 (defer indefinitely)
- **Semantic / vector search** — embedding-based similarity. Requires ML infrastructure. Skip until you have a clear use case.
- **Voice search**
- **Search-as-you-type AI suggestions**
- **Cross-workspace organization-wide search** (depends on Organization model from §15.4)
**Total to "world-class search":** ~8-11 weeks across Tiers 1-3.
### 21.6 The fork choice for search
**Fork SA: Tiers 1-3 (~8-11 weeks).** Best-in-class search rivaling Notion/Slack.
**Fork SB: Tier 1 only (~2-3 weeks).** Comments search, snippet highlighting, filter params, member search, search history. Closes the worst gaps. Most users wouldn't notice the difference between this and full Tier 2.
**Fork SC: Defer entirely.** Current spec is functional. Search isn't a daily-use feature for most users until the platform has hundreds of documents/tasks. Wait for usage data.
**Honest recommendation: Fork SB.** Tier 1 closes the painful gaps (no comments search, no snippet highlighting, no filter params). The investment is modest (~2-3 weeks). Tier 2 features can wait for usage data showing users want advanced operators. Tier 3 (file content, multi-language, semantic) is for later when the platform scales.
### 21.7 What top platforms get wrong (your opportunity)
Common search failures across the industry:
1. **Conflating navigation and content search.** Some platforms force users to know whether they're searching for a page or trying to navigate. Cmd+K palettes that mix both well (Linear, Notion) are rare. Yours separates this clearly via prefix.
2. **No saved searches.** Users repeatedly type the same complex query. Saved searches with notify-on-match are a productivity multiplier.
3. **No privacy-first query logging.** Many platforms log raw queries indefinitely. Yours hashes from the start — strong.
4. **Cold-start performance.** First query after deployment is slow because GIN indexes aren't warm. Top platforms run a synthetic query post-deploy to warm caches.
5. **Stale indexes during active editing.** Search results reflect the last save, not current state. Hard problem with CRDTs; eventual consistency is the right tradeoff for v1.
6. **No "search this folder" scoping.** Users in deep folder trees want to limit search scope to their current branch. Few platforms do this; you could.
7. **Generic search results regardless of who's searching.** Top platforms personalize: "show me my own documents first." Adds complexity but improves perceived relevance.
CollabSphere can be the platform that **ships search with privacy-first architecture, comments-included, snippet-highlighted, filter-rich, and saved-searches**. That's a Tier 1 + 2 outcome — about 5-7 weeks of focused work — and would put you ahead of most competitors at the v1 stage.
### 21.8 Cumulative roadmap (final update with all 21 surfaces)
| Surface | Recommended fork | Weeks |
|---|---|---|
| Phase 0 foundations | NestJS + Vitest + fixtures + observability + CI + DB | 4-5 |
| Phase 1 production readiness | prod env + security + integration tests + coverage | 4-6 |
| Phase 1.5 file uploads (Fork FB) | F0 + F1 | 5-6 |
| Editor depth (Fork B / professional) | §11.10 | 6-8 |
| Real templates | §11.10 follow-on | 2-3 |
| Diagrams + export | §11.10 follow-on | 3-4 |
| Tasks (Fork TC: 5 must-haves) | §12.10 | 3-5 |
| Tasks (Fork TB: Linear-lite) | §12.10 | 6-7 |
| Comments (Fork CB: Tier 1) | §13.7 | 3-4 |
| File tree (Fork FB: Tier 1) | §14.8 | 3-4 |
| Workspace (Fork WC: reactive) | §15.8 | 2 |
| Collab depth | §6.1 | 4-6 |
| Academic (Fork EB: minimum viable) | §16.5 | 6-8 |
| Professional (Fork PC: defer) | §17.A.5 | 0 |
| Files Phase F2 (virus scan, versioning) | §17.B.5 | 2 |
| Analytics (Fork XB: real backend) | §17.C.6 | 4-5 |
| Notifications (Fork NB: Tier 1) | §18.A.6 | 3-4 |
| Members (Fork MB: Tier 1) | §18.B.6 | 3-4 |
| Activity + Audit (Fork ZB: Tier 1) | §19.6 | 3-4 |
| Admin (Fork QC: schema + impersonation + GDPR) | §20.6 | 1-2 |
| **Search (Fork SB: Tier 1)** | **§21.6** | **2-3** |
| **Cumulative ("professional" everywhere)** | | **69-90 weeks** |
That's now **16-20 months** of focused engineering for a coherent v1 across all 21 surfaces investigated. World-class everywhere extends to 28-38 months.
### 21.9 Closing the search re-evaluation
Search is the **highest architectural quality / lowest implementation cost surface** of any we've reviewed. The architecture is sound (PostgreSQL FTS, weighted indexing, privacy-first logging, three-mode scope separation). The implementation gap is narrow (Tier 1 = 2-3 weeks, brings comments + snippets + filters + member search + history). Tier 2 features (saved searches, operators, suggestions) are optional polish that adds another 3-4 weeks.
This was a useful investigation. Out of all 21 parts, search is one of the few surfaces where the spec quality genuinely outpaces the implementation effort needed to match it. The plan is clear, the work is modest, the impact is high.
---
## Closing across all 21 parts of investigation
We've now investigated 21 distinct surfaces / system layers across the project:
**Foundations (Parts 1-6):**
1. NestJS migration
2. Testing methodology
3. CI / Docker / DB / Infrastructure
4. Agent rules + frontend + session memory
5. Realtime collab (Hocuspocus)
6. External session state (Notion / Obsidian)
**Surfaces (Parts 7-21):**
7. Templates + document editor
8. Tasks
9. Comments
10. File tree
11. Workspace
12. Academic submission & review
13. Professional workspace mode
14. Files & attachments
15. Analytics
16. Notifications
17. Members
18. Activity feed & audit log
19. Admin console
20. **Search system**
The accumulated decision matrix is now around **105 architecture/scope choices** clustered around **17 critical ones**:
1. Phase 0 foundations acceptance
2. NestJS migration approach
3. Template + editor fork (B: professional)
4. Tasks fork (TC + TB)
5. Comments fork (CB: Tier 1)
6. File tree fork (FB: Tier 1)
7. Workspace fork (WC: reactive)
8. **Academic fork (EB: differentiator)**
9. Professional fork (PC: defer)
10. Files fork (FB Phase F0+F1)
11. Analytics fork (XB: real backend)
12. Notifications fork (NB: Tier 1)
13. Members fork (MB: Tier 1)
14. Activity + Audit fork (ZB: Tier 1)
15. Admin fork (QC: schema + impersonation + GDPR)
16. **Search fork (SB: Tier 1, 2-3 weeks)**
17. Rule system additions (current-state + session logs + skill cards + husky + lint, 1 week)
Plus dozens of sub-decisions per fork. All documented across Parts 1-21.
---
## And now, the conversation
You said you wanted one more investigation, then to discuss the things I said in my previous reply. I've delivered the investigation. Whenever you're ready, here are the things from my previous message worth talking about:
1. **The pattern of "investigate one more thing" repeating across the last 5 reports.** I named it; you said I was right. What does it mean for what you do next?
2. **The three options I offered:** Path 1 (just say "let's ship"), Path 2 (5-6 quick decisions), Path 3 (one more investigation — which became this one).
3. **The 17 critical decisions** waiting on you. Most have strong recommendations. Some don't need to be decided today; others (Phase 0 acceptance, NestJS approach, academic fork) genuinely matter for the first execution prompt.
4. **Whether more investigation is what's blocking you, or whether deciding-and-shipping is.** This is the honest question. Only you can answer it.
5. **What "ship" looks like in practice.** I write the first execution prompt the same shape as the verify-email round prompts. You hand it to your tool of choice (antigravity / Claude / Cursor). They execute. You review. You merge. ~1-2 weeks per Phase 0 story. ~8-11 weeks total for Phase 0.
I want to be useful. Right now, the most useful thing I can do isn't another investigation. It's having this conversation honestly with you. The 21 reports are real assets — they will help every future story. But they're also a moat that becomes harder to cross the longer it gets.
Tell me what you're thinking. Take your time. I'm here for the discussion.