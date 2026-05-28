// Templates catalog — workspace templates (browsable here, used at workspace
// creation) and document templates (usable any time inside an editor flow).

export type TemplateCategory = "professional" | "academic" | "general";

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tagline: string;
  preview: {
    folders: string[];
    documents: { title: string; folder: string }[];
    taskColumns: string[];
    settings: {
      submissionWorkflowEnabled: boolean;
      supervisorReviewEnabled?: boolean;
      roleLabel: string;
    };
  };
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: "meeting" | "planning" | "research" | "writing" | "engineering";
  estReadMin: number;
  preview: {
    sections: string[];
  };
}

/** Workspace templates are loaded from `GET /api/v1/templates?kind=workspace`. */
export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [];

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "doc-blank",
    name: "Blank document",
    description: "Just a title and a cursor. Start writing.",
    category: "writing",
    estReadMin: 0,
    preview: { sections: ["(empty)"] },
  },
  {
    id: "doc-meeting-notes",
    name: "Meeting notes",
    description: "Agenda, attendees, decisions, and action items in one structured layout.",
    category: "meeting",
    estReadMin: 3,
    preview: {
      sections: ["Agenda", "Attendees", "Discussion", "Decisions", "Action items"],
    },
  },
  {
    id: "doc-1on1",
    name: "1:1 notes",
    description: "A recurring template for manager / report sync. Carries forward open threads.",
    category: "meeting",
    estReadMin: 2,
    preview: {
      sections: ["Wins", "Blockers", "Topics", "Feedback", "Next steps"],
    },
  },
  {
    id: "doc-prd",
    name: "Product requirements (PRD)",
    description: "Problem, users, scope, success metrics, and rollout plan.",
    category: "planning",
    estReadMin: 8,
    preview: {
      sections: ["Problem", "Users", "Goals", "Scope", "Out of scope", "Metrics", "Rollout"],
    },
  },
  {
    id: "doc-rfc",
    name: "Engineering RFC",
    description: "Proposal for a technical change. Context, design, alternatives, risks.",
    category: "engineering",
    estReadMin: 10,
    preview: {
      sections: ["Context", "Proposal", "Design", "Alternatives", "Risks", "Open questions"],
    },
  },
  {
    id: "doc-adr",
    name: "Architecture decision record",
    description: "Lightweight ADR — one decision, one page. Accepted / superseded states.",
    category: "engineering",
    estReadMin: 4,
    preview: {
      sections: ["Status", "Context", "Decision", "Consequences"],
    },
  },
  {
    id: "doc-postmortem",
    name: "Incident postmortem",
    description: "Blameless postmortem. Timeline, contributing factors, and corrective actions.",
    category: "engineering",
    estReadMin: 12,
    preview: {
      sections: ["Summary", "Timeline", "Impact", "Root causes", "Corrective actions"],
    },
  },
  {
    id: "doc-research-brief",
    name: "Research brief",
    description: "Hypothesis, method, findings, and recommended next experiments.",
    category: "research",
    estReadMin: 6,
    preview: {
      sections: ["Hypothesis", "Method", "Findings", "Limitations", "Next steps"],
    },
  },
  {
    id: "doc-lit-review",
    name: "Literature review",
    description: "Structured matrix for comparing sources, methods, and gaps.",
    category: "research",
    estReadMin: 15,
    preview: {
      sections: ["Scope", "Sources", "Themes", "Gaps", "Synthesis"],
    },
  },
  {
    id: "doc-spec",
    name: "Functional spec",
    description: "User stories, acceptance criteria, edge cases, and dependencies.",
    category: "planning",
    estReadMin: 7,
    preview: {
      sections: ["Overview", "User stories", "Acceptance criteria", "Edge cases", "Dependencies"],
    },
  },
];

export function getWorkspaceTemplate(_id: string): WorkspaceTemplate | undefined {
  return undefined;
}
export function getDocumentTemplate(id: string) {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}
