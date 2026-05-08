/**
 * Template schema (v2) + readiness engine for CollabSphere documents.
 *
 * Why v2 exists
 * -------------
 * The mock template seed (`mock-template-seed.ts`) renders a document
 * template by emitting an `<h1>` plus one `<h2>` per section name. That is
 * fine as a *seed*, but it leaves the editor with no structural memory: a
 * user can delete every required heading and submit an empty document.
 *
 * v2 keeps the seed exactly as-is (so existing flows keep working) but
 * additionally describes a `TemplateContract` — the structural and
 * content commitments a template makes about the documents created from
 * it. The editor reads this contract to:
 *
 *   1. Render a "Readiness" panel that lists missing required sections,
 *      under-length sections, and missing required block kinds (e.g. the
 *      "Acceptance criteria" section needs a table).
 *   2. Gate the existing Submit-for-review button on a configurable
 *      enforcement level.
 *
 * Per dev-rev §11.5 we target **level 3 — section-level enforcement**:
 * required sections, minimum word counts, and required block kinds. We do
 * NOT lock headings against deletion (level 4+) because that fights the
 * user; the panel surfaces deviations and the submit gate handles
 * compliance.
 *
 * OSS-only
 * --------
 * No Tiptap Pro features are used. Section detection runs against the
 * editor's headings (StarterKit), block detection runs against the
 * exposed node types from our OSS extensions (`table`, `mermaidBlock`,
 * `mathBlock`).
 */

import type { Editor } from "@tiptap/react";

// ─── Contract types ─────────────────────────────────────────────────────

/** The kinds of structured blocks the readiness engine can detect. */
export type RequiredBlockKind =
  | "table"
  | "mermaidBlock"
  | "mathBlock"
  | "image"
  | "codeBlock"
  | "sectionBlock";

/**
 * A single required section. Identified by exact heading text + level so
 * the engine can give precise "missing" feedback. Headings are matched
 * case-insensitively and ignoring leading numbers like "1." / "1.1" so a
 * user who renames "Introduction" to "1. Introduction" doesn't break the
 * contract.
 */
export interface RequiredSection {
  /** Stable id used by the panel for keys and scroll targets. */
  id: string;
  /** Heading text shown in the document, e.g. "Introduction". */
  headingText: string;
  /** Heading level (1-6). Most templates use 2. */
  headingLevel: 1 | 2 | 3 | 4 | 5 | 6;
  /** Optional minimum body word count, counted between this heading
   *  and the next heading at the same-or-higher level. */
  minimumWordCount?: number;
  /** Optional structured blocks that must appear inside this section. */
  requiredBlocks?: Array<{ kind: RequiredBlockKind; label: string }>;
  /** Short helper text shown in the readiness panel. */
  hint?: string;
}

/** What "ready" means for this template. */
export type EnforcementLevel =
  /** Show the panel but never block submit. */
  | "advisory"
  /** Block submit until every required section is present. */
  | "sections-required"
  /** Block submit until every section is present AND meets word count
   *  AND all required blocks are present. */
  | "strict";

export interface TemplateContract {
  /** Matches the template id from `mock-templates.ts`. */
  templateId: string;
  /** Human label, displayed in the readiness panel header. */
  templateName: string;
  /** Schema version. v1 = legacy seed only (no contract). v2 = this. */
  schemaVersion: 2;
  enforcement: EnforcementLevel;
  sections: RequiredSection[];
}

// ─── Built-in contracts ─────────────────────────────────────────────────

/**
 * Built-in v2 contracts for a representative subset of the catalog.
 * Templates without an entry here fall back to "advisory" with no
 * required items — the panel reports "freeform" and submit is never
 * gated on structure.
 *
 * Adding a contract here is the entire wiring story: the editor will
 * automatically pick it up on next document open.
 */
export const TEMPLATE_CONTRACTS: Record<string, TemplateContract> = {
  "doc-prd": {
    templateId: "doc-prd",
    templateName: "Product Requirements (PRD)",
    schemaVersion: 2,
    enforcement: "sections-required",
    sections: [
      {
        id: "problem",
        headingText: "Problem",
        headingLevel: 2,
        minimumWordCount: 60,
        hint: "What user pain does this address? Be specific.",
      },
      {
        id: "users",
        headingText: "Users",
        headingLevel: 2,
        minimumWordCount: 30,
        hint: "Who experiences this and how often.",
      },
      { id: "goals", headingText: "Goals", headingLevel: 2, minimumWordCount: 30 },
      { id: "scope", headingText: "Scope", headingLevel: 2, minimumWordCount: 40 },
      { id: "out-of-scope", headingText: "Out of scope", headingLevel: 2 },
      {
        id: "metrics",
        headingText: "Metrics",
        headingLevel: 2,
        minimumWordCount: 20,
        requiredBlocks: [{ kind: "table", label: "Metrics table" }],
        hint: "Quantitative targets in a table — one row per metric.",
      },
      { id: "rollout", headingText: "Rollout", headingLevel: 2 },
    ],
  },
  "doc-rfc": {
    templateId: "doc-rfc",
    templateName: "Engineering RFC",
    schemaVersion: 2,
    enforcement: "sections-required",
    sections: [
      { id: "context", headingText: "Context", headingLevel: 2, minimumWordCount: 80 },
      { id: "proposal", headingText: "Proposal", headingLevel: 2, minimumWordCount: 80 },
      {
        id: "design",
        headingText: "Design",
        headingLevel: 2,
        minimumWordCount: 50,
        hint: "Add a sequence/flow diagram via /mermaid for clarity.",
      },
      { id: "alternatives", headingText: "Alternatives", headingLevel: 2 },
      { id: "risks", headingText: "Risks", headingLevel: 2 },
      { id: "open-questions", headingText: "Open questions", headingLevel: 2 },
    ],
  },
  "doc-adr": {
    templateId: "doc-adr",
    templateName: "Architecture Decision Record",
    schemaVersion: 2,
    enforcement: "sections-required",
    sections: [
      { id: "status", headingText: "Status", headingLevel: 2 },
      { id: "context", headingText: "Context", headingLevel: 2, minimumWordCount: 50 },
      { id: "decision", headingText: "Decision", headingLevel: 2, minimumWordCount: 30 },
      {
        id: "consequences",
        headingText: "Consequences",
        headingLevel: 2,
        minimumWordCount: 30,
      },
    ],
  },
  "doc-postmortem": {
    templateId: "doc-postmortem",
    templateName: "Incident Postmortem",
    schemaVersion: 2,
    enforcement: "strict",
    sections: [
      { id: "summary", headingText: "Summary", headingLevel: 2, minimumWordCount: 40 },
      {
        id: "timeline",
        headingText: "Timeline",
        headingLevel: 2,
        requiredBlocks: [{ kind: "table", label: "Timeline table" }],
        hint: "One row per event, in chronological order.",
      },
      { id: "impact", headingText: "Impact", headingLevel: 2, minimumWordCount: 40 },
      {
        id: "root-causes",
        headingText: "Root causes",
        headingLevel: 2,
        minimumWordCount: 60,
        hint: "Stay blameless. Address contributing factors, not people.",
      },
      {
        id: "corrective-actions",
        headingText: "Corrective actions",
        headingLevel: 2,
        requiredBlocks: [{ kind: "table", label: "Action item table" }],
      },
    ],
  },
  "doc-spec": {
    templateId: "doc-spec",
    templateName: "Functional Spec",
    schemaVersion: 2,
    enforcement: "sections-required",
    sections: [
      { id: "overview", headingText: "Overview", headingLevel: 2, minimumWordCount: 40 },
      {
        id: "user-stories",
        headingText: "User stories",
        headingLevel: 2,
        minimumWordCount: 60,
      },
      {
        id: "acceptance-criteria",
        headingText: "Acceptance criteria",
        headingLevel: 2,
        requiredBlocks: [{ kind: "table", label: "Criteria table" }],
      },
      { id: "edge-cases", headingText: "Edge cases", headingLevel: 2 },
      { id: "dependencies", headingText: "Dependencies", headingLevel: 2 },
    ],
  },
  "doc-research-brief": {
    templateId: "doc-research-brief",
    templateName: "Research Brief",
    schemaVersion: 2,
    enforcement: "sections-required",
    sections: [
      {
        id: "hypothesis",
        headingText: "Hypothesis",
        headingLevel: 2,
        minimumWordCount: 30,
      },
      {
        id: "method",
        headingText: "Method",
        headingLevel: 2,
        minimumWordCount: 60,
        hint: "Use math blocks (/math) for any formal definitions.",
      },
      { id: "findings", headingText: "Findings", headingLevel: 2, minimumWordCount: 60 },
      { id: "limitations", headingText: "Limitations", headingLevel: 2 },
      { id: "next-steps", headingText: "Next steps", headingLevel: 2 },
    ],
  },
  "doc-lit-review": {
    templateId: "doc-lit-review",
    templateName: "Literature Review",
    schemaVersion: 2,
    enforcement: "sections-required",
    sections: [
      { id: "scope", headingText: "Scope", headingLevel: 2, minimumWordCount: 40 },
      {
        id: "sources",
        headingText: "Sources",
        headingLevel: 2,
        requiredBlocks: [{ kind: "table", label: "Sources matrix" }],
      },
      { id: "themes", headingText: "Themes", headingLevel: 2, minimumWordCount: 60 },
      { id: "gaps", headingText: "Gaps", headingLevel: 2 },
      { id: "synthesis", headingText: "Synthesis", headingLevel: 2, minimumWordCount: 60 },
    ],
  },
  "doc-meeting-notes": {
    templateId: "doc-meeting-notes",
    templateName: "Meeting Notes",
    schemaVersion: 2,
    enforcement: "advisory",
    sections: [
      { id: "agenda", headingText: "Agenda", headingLevel: 2 },
      { id: "attendees", headingText: "Attendees", headingLevel: 2 },
      { id: "discussion", headingText: "Discussion", headingLevel: 2 },
      { id: "decisions", headingText: "Decisions", headingLevel: 2 },
      { id: "action-items", headingText: "Action items", headingLevel: 2 },
    ],
  },
  "doc-1on1": {
    templateId: "doc-1on1",
    templateName: "1:1 Notes",
    schemaVersion: 2,
    enforcement: "advisory",
    sections: [
      { id: "wins", headingText: "Wins", headingLevel: 2 },
      { id: "blockers", headingText: "Blockers", headingLevel: 2 },
      { id: "topics", headingText: "Topics", headingLevel: 2 },
      { id: "feedback", headingText: "Feedback", headingLevel: 2 },
      { id: "next-steps", headingText: "Next steps", headingLevel: 2 },
    ],
  },
};

export function getTemplateContract(
  templateId: string | null | undefined,
): TemplateContract | null {
  if (!templateId) return null;
  return TEMPLATE_CONTRACTS[templateId] ?? null;
}

// ─── Readiness engine ───────────────────────────────────────────────────

export type SectionStatus = "missing" | "underweight" | "ok";

export interface SectionReadiness {
  section: RequiredSection;
  status: SectionStatus;
  /** Word count of the body between this heading and the next at the
   *  same-or-higher level. 0 if missing. */
  wordCount: number;
  /** Block kinds that the contract said this section needed but that
   *  weren't found inside it. */
  missingBlocks: Array<{ kind: RequiredBlockKind; label: string }>;
  /** Document position (for scroll-to-heading) when the section was
   *  found, otherwise null. */
  pos: number | null;
}

export interface DocumentReadiness {
  /** True when the whole document satisfies its template contract at the
   *  template's enforcement level. */
  isReady: boolean;
  /** Whether the contract is gating submit (false → advisory only). */
  blocksSubmit: boolean;
  /** 0 ≤ x ≤ 1 — fraction of required items satisfied (sections + word
   *  counts + blocks combined). */
  progress: number;
  /** "8 of 12 items complete" style counter. */
  completed: number;
  /** Total required items. */
  total: number;
  /** Per-section detail, in contract order. */
  sections: SectionReadiness[];
  /** First human-readable reason submit is gated, or null when ready. */
  blockingReason: string | null;
}

/** Strip leading numbering like "1.", "1.1", "1.1.1 " from a heading. */
function normalizeHeading(text: string): string {
  return text
    .replace(/^\s*\d+(\.\d+)*\.?\s+/, "")
    .trim()
    .toLowerCase();
}

/** Count words inside an arbitrary plain-text string. */
function countWords(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/**
 * Walk the doc once and emit ordered events:
 *   - heading: { level, text, pos }
 *   - block:   { kind, pos }
 *   - paragraphText: text aggregated into the current section.
 *
 * We then group by heading level to determine each section's body range.
 *
 * This intentionally uses the raw ProseMirror node tree (not the JSON
 * roundtrip) so we don't pay a serialization cost on every keystroke.
 */
export function computeReadiness(
  editor: Editor | null,
  contract: TemplateContract | null,
): DocumentReadiness | null {
  if (!contract) return null;
  if (!editor) {
    // Editor not mounted yet — report all required items as missing so
    // the panel can render its skeleton + final shape immediately.
    const missingSections: SectionReadiness[] = contract.sections.map((s) => ({
      section: s,
      status: "missing",
      wordCount: 0,
      missingBlocks: s.requiredBlocks ?? [],
      pos: null,
    }));
    return rollUp(contract, missingSections);
  }

  // ── Pass 1: collect headings and structured-block positions. ──
  type HeadingHit = { level: number; text: string; pos: number };
  type BlockHit = { kind: RequiredBlockKind; pos: number };

  const headings: HeadingHit[] = [];
  const blocks: BlockHit[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      headings.push({
        level: node.attrs.level as number,
        text: node.textContent,
        pos,
      });
      return false; 
    }
    if (node.type.name === "sectionBlock") {
      headings.push({
        level: 2, // Semantic sections default to level 2 for contract matching
        text: node.attrs.title || "",
        pos,
      });
      // We don't return false here because section blocks contain content 
      // (paragraphs, tables) that we might want to scan for word counts/blocks.
    }
    const kind = mapNodeNameToBlockKind(node.type.name);
    if (kind) {
      blocks.push({ kind, pos });
    }
    return true;
  });

  // ── Pass 2: match each required section to a heading. ──
  const sections: SectionReadiness[] = contract.sections.map((req) => {
    const target = normalizeHeading(req.headingText);
    const matchIdx = headings.findIndex(
      (h) => h.level === req.headingLevel && normalizeHeading(h.text) === target,
    );
    if (matchIdx === -1) {
      return {
        section: req,
        status: "missing",
        wordCount: 0,
        missingBlocks: req.requiredBlocks ?? [],
        pos: null,
      };
    }
    const heading = headings[matchIdx];
    // Section body ends at the next heading of the same-or-higher level,
    // or at end of document.
    const nextIdx = headings.findIndex(
      (h, i) => i > matchIdx && h.level <= heading.level,
    );
    const sectionEnd =
      nextIdx === -1 ? editor.state.doc.content.size : headings[nextIdx].pos;
    const sectionStart = heading.pos + heading.text.length + 2; // skip heading itself
    const bodyText = editor.state.doc.textBetween(
      Math.min(sectionStart, sectionEnd),
      sectionEnd,
      "\n",
      "\n",
    );
    const wordCount = countWords(bodyText);

    // Required blocks inside this section.
    const missingBlocks = (req.requiredBlocks ?? []).filter(
      (rb) =>
        !blocks.some(
          (b) => b.kind === rb.kind && b.pos > heading.pos && b.pos < sectionEnd,
        ),
    );

    let status: SectionStatus = "ok";
    if (req.minimumWordCount && wordCount < req.minimumWordCount) {
      status = "underweight";
    }
    if (missingBlocks.length > 0) {
      status = "underweight";
    }

    return {
      section: req,
      status,
      wordCount,
      missingBlocks,
      pos: heading.pos,
    };
  });

  return rollUp(contract, sections);
}

function rollUp(
  contract: TemplateContract,
  sections: SectionReadiness[],
): DocumentReadiness {
  let completed = 0;
  let total = 0;
  for (const s of sections) {
    // Each required section is one item.
    total += 1;
    if (s.status !== "missing") completed += 1;
    // Each minimum-word-count requirement is one item.
    if (s.section.minimumWordCount) {
      total += 1;
      if (s.status === "ok") completed += 1;
    }
    // Each required block kind is one item.
    for (const rb of s.section.requiredBlocks ?? []) {
      total += 1;
      if (!s.missingBlocks.some((m) => m.kind === rb.kind)) {
        completed += 1;
      }
    }
  }
  const progress = total === 0 ? 1 : completed / total;
  const isStructuralReady = sections.every((s) => s.status !== "missing");
  const isStrictReady = sections.every((s) => s.status === "ok");

  let blocksSubmit = false;
  let isReady = true;
  let blockingReason: string | null = null;

  if (contract.enforcement === "sections-required") {
    blocksSubmit = !isStructuralReady;
    isReady = isStructuralReady;
    if (!isReady) {
      const first = sections.find((s) => s.status === "missing");
      blockingReason = first
        ? `Missing required section "${first.section.headingText}".`
        : "Missing required sections.";
    }
  } else if (contract.enforcement === "strict") {
    blocksSubmit = !isStrictReady;
    isReady = isStrictReady;
    if (!isReady) {
      const firstMissing = sections.find((s) => s.status === "missing");
      const firstUnder = sections.find((s) => s.status === "underweight");
      if (firstMissing) {
        blockingReason = `Missing required section "${firstMissing.section.headingText}".`;
      } else if (firstUnder) {
        if (firstUnder.missingBlocks.length > 0) {
          blockingReason = `"${firstUnder.section.headingText}" is missing ${firstUnder.missingBlocks[0].label.toLowerCase()}.`;
        } else {
          blockingReason = `"${firstUnder.section.headingText}" needs at least ${firstUnder.section.minimumWordCount} words (currently ${firstUnder.wordCount}).`;
        }
      }
    }
  } else {
    // advisory — never blocks
    blocksSubmit = false;
    isReady = isStrictReady;
  }

  return {
    isReady,
    blocksSubmit,
    progress,
    completed,
    total,
    sections,
    blockingReason,
  };
}

function mapNodeNameToBlockKind(name: string): RequiredBlockKind | "sectionBlock" | null {
  switch (name) {
    case "table":
      return "table";
    case "mermaidBlock":
      return "mermaidBlock";
    case "mathBlock":
      return "mathBlock";
    case "image":
      return "image";
    case "codeBlock":
      return "codeBlock";
    case "sectionBlock":
      return "sectionBlock";
    default:
      return null;
  }
}
