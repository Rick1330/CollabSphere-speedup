# Document template enforcement

> Implementation: `apps/web/src/features/documents/template-schema.ts`
> Surface:        `apps/web/src/features/documents/components/editor/editor-readiness-panel.tsx`

## Purpose

A document that opens from a template (PRD, RFC, ADR, postmortem,
research brief…) has structural commitments that should be visible
while the user types and that should gate the **Submit for review**
action. Without this, a user can delete every required heading and
still submit an empty PRD.

## Schema

A `TemplateContract` (v2) declares what a template-bound document needs.
Each entry lives in `TEMPLATE_CONTRACTS` keyed by the template id from
`mock-templates.ts`.

```ts
interface TemplateContract {
  templateId: string;
  templateName: string;
  schemaVersion: 2;
  enforcement: "advisory" | "sections-required" | "strict";
  sections: RequiredSection[];
}

interface RequiredSection {
  id: string;
  headingText: string;
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
  minimumWordCount?: number;
  requiredBlocks?: Array<{ kind: RequiredBlockKind; label: string }>;
  hint?: string;
}
```

`RequiredBlockKind` is one of: `table`, `mermaidBlock`, `mathBlock`,
`image`, `codeBlock`. The set is bound to the OSS extensions wired into
the editor — adding a new kind requires the extension to expose the
matching node name.

## Enforcement levels

| Level | Submit gating |
|---|---|
| `advisory` | Never blocks. Panel is informational only. |
| `sections-required` | Blocks until every required section heading is present. |
| `strict` | Blocks until every section is present **and** meets word count **and** has all required blocks. |

We deliberately stop at level 3 — we do **not** lock headings against
deletion (level 4+) because that fights the user. The panel surfaces
deviations; the submit button enforces compliance.

## Section detection

Heading matching is:

- **Case-insensitive** ("Introduction" == "INTRODUCTION").
- **Numbering-tolerant** ("1. Introduction" matches "Introduction").
- **Level-strict** (an h3 named "Goals" does not satisfy a level-2
  "Goals" requirement).

A section's body is the text between its heading and the next heading
of the same-or-higher level (or end of document). Word counts and
required-block checks run inside that range.

## Built-in contracts

| Template id | Enforcement | Required blocks |
|---|---|---|
| `doc-prd` | sections-required | Metrics: table |
| `doc-rfc` | sections-required | — |
| `doc-adr` | sections-required | — |
| `doc-postmortem` | strict | Timeline: table, Corrective actions: table |
| `doc-spec` | sections-required | Acceptance criteria: table |
| `doc-research-brief` | sections-required | — |
| `doc-lit-review` | sections-required | Sources: table |
| `doc-meeting-notes` | advisory | — |
| `doc-1on1` | advisory | — |

Templates without a contract fall back to advisory + zero requirements.

## Wire-up

```ts
const contract = getTemplateContract(doc.templateId);  // null = no gate
const readiness = useDocumentReadiness(editor, contract);

// Rendered in the right rail (EditorContextRail).
// Gating in submit dialog:
const canSubmit = docHasContent && !(readiness?.blocksSubmit ?? false);
const blockReason = readiness?.blockingReason ?? undefined;
```

## What this is NOT

- **Not a server-side gate.** Backend submission endpoints must
  re-validate against the same contract before persisting status
  changes (see `docs/agent-ref/api/document-endpoints.md` when the
  submit endpoint lands).
- **Not a heading lock.** Users can rename / delete required headings.
  The panel reports the deviation; submit is blocked until corrected.
- **Not freeform validation.** Custom rules (regexes on body text,
  required mentions, etc.) are intentionally out of scope.

## Extending

To add a new contract:

1. Add an entry to `TEMPLATE_CONTRACTS` in `template-schema.ts` keyed
   by the template id.
2. Pick the lowest enforcement level that meets the policy goal.
3. Use `requiredBlocks` sparingly — every required block adds friction.

To support a new block kind, extend `RequiredBlockKind` and update
`mapNodeNameToBlockKind` to map the Tiptap node name.
