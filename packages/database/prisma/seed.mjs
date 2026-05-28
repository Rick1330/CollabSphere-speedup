/**
 * Seeds system workspace + document templates (idempotent upserts).
 * Run: `pnpm --filter @collabsphere/database exec prisma db seed`
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const doc = (id, category, name, description, requiredBlockTypes, blocks) => ({
  id,
  kind: "document",
  category,
  subCategory: "general",
  scope: "system",
  name,
  description,
  version: 1,
  schemaVersion: 2,
  contentFormat: "document-v2",
  isEnabled: true,
  content: {
    schemaVersion: 2,
    format: "document-v2",
    metadata: { title: name, category, kind: "document" },
    properties: {
      enforcement: {
        requiredBlockTypes,
      },
    },
    structure: {
      blocks,
    },
  },
});

const blankDocumentTemplate = ({
  id,
  category,
  name,
  description,
  subCategory = "general",
}) => ({
  id,
  kind: "document",
  category,
  subCategory,
  scope: "system",
  name,
  description,
  version: 1,
  schemaVersion: 2,
  contentFormat: "document-v2",
  isEnabled: true,
  // IMPORTANT: must be parseable by `parseDocumentTemplateContent` (structure.blocks array).
  content: {
    schemaVersion: 2,
    format: "document-v2",
    metadata: { title: name, category, kind: "document" },
    properties: {},
    structure: {
      blocks: [],
    },
  },
});

const workspace = (id, category, name, description, workspacePayload, subCategory = "general") => ({
  id,
  kind: "workspace",
  category,
  subCategory,
  scope: "system",
  name,
  description,
  version: 1,
  schemaVersion: 2,
  contentFormat: "workspace-v2",
  isEnabled: true,
  content: {
    schemaVersion: 2,
    format: "workspace-v2",
    metadata: { title: name, category, kind: "workspace" },
    structure: {
      workspace: workspacePayload,
    },
  },
});

const defaultTaskColumns = [
  { name: "Backlog", status: "backlog" },
  { name: "To do", status: "todo" },
  { name: "In progress", status: "in_progress" },
  { name: "In review", status: "in_review" },
  { name: "Done", status: "done" },
];

const defaultFolders = [
  { key: "root-docs", name: "Documents" },
  { key: "root-notes", name: "Notes" },
];

const LEGACY_WORKSPACE_TEMPLATE_IDS = [
  "professional-team",
  "academic-thesis",
  "academic-coursework",
  "general-blank",
];

async function main() {
  const removedLegacy = await prisma.template.deleteMany({
    where: { id: { in: LEGACY_WORKSPACE_TEMPLATE_IDS } },
  });
  if (removedLegacy.count > 0) {
    console.log(`Removed ${removedLegacy.count} legacy workspace template(s).`);
  }

  const workspaceTemplates = [
    // Guide-defined templates (new-rev/CollabSphere_Workspace_Templates_Academic_Submission_Addendum.md)
    workspace(
      "tpl_workspace_academic_senior_project_v1",
      "academic",
      "Senior Project",
      "A supervised final year group project workspace with full academic workflow: requirements analysis, system design, implementation, and document submission for supervisor review.",
      {
        defaults: {
          workspaceSettings: {
            submissionWorkflowEnabled: true,
            allowViewerCommentsOnDocs: true,
            allowViewerCommentsOnTasks: false,
            allowViewerExport: true,
          },
          roleLabels: {
            OWNER: "Supervisor",
            ADMIN: "Teaching Assistant",
            MANAGER: "Project Lead",
            MEMBER: "Student",
            VIEWER: "Reviewer",
          },
          taskLabels: [
            { name: "deliverable", color: "#7c3aed", description: "A document or artifact to be submitted" },
            { name: "research", color: "#0284c7", description: "Background research task" },
            { name: "implementation", color: "#059669", description: "Code or system implementation task" },
            { name: "meeting", color: "#d97706", description: "Meeting preparation or follow-up" },
            { name: "review", color: "#dc2626", description: "Review or feedback required" },
            { name: "blocked", color: "#9ca3af", description: "Waiting on something external" },
          ],
          onboardingDocKey: "workspace-guide",
        },
        folders: [
          { key: "administration", name: "Administration", parentKey: null, icon: "📋" },
          { key: "requirements", name: "Requirements", parentKey: null, icon: "📝" },
          { key: "design", name: "Design", parentKey: null, icon: "🏗️" },
          { key: "implementation", name: "Implementation", parentKey: null, icon: "💻" },
          { key: "testing", name: "Testing", parentKey: null, icon: "🧪" },
          { key: "reports", name: "Reports", parentKey: null, icon: "📊" },
          { key: "meetings", name: "Meeting Minutes", parentKey: "administration", icon: "🗓️" },
          { key: "resources", name: "Research & Resources", parentKey: "requirements", icon: "🔬" },
        ],
        documents: [
          { key: "workspace-guide", title: "📖 How to Use This Workspace", folderKey: "administration", documentTemplateId: "tpl_doc_academic_workspace_guide_v1" },
          { key: "team-charter", title: "Team Charter & Agreements", folderKey: "administration", documentTemplateId: "tpl_doc_academic_team_charter_v1" },
          { key: "supervisor-meeting-template", title: "Supervisor Meeting Notes", folderKey: "meetings", documentTemplateId: "tpl_doc_academic_meeting_minutes_v1" },
          { key: "team-meeting-template", title: "Team Meeting Notes", folderKey: "meetings", documentTemplateId: "tpl_doc_academic_meeting_minutes_v1" },
          { key: "project-proposal", title: "Project Proposal", folderKey: "requirements", documentTemplateId: "tpl_doc_academic_proposal_v1", submissionEnabled: true },
          { key: "rad", title: "Requirement Analysis Document (RAD)", folderKey: "requirements", documentTemplateId: "tpl_doc_academic_rad_v1", submissionEnabled: true },
          { key: "literature-review", title: "Literature Review", folderKey: "resources", documentTemplateId: "tpl_doc_academic_literature_review_v1" },
          { key: "rdd", title: "Requirement Design Document (RDD)", folderKey: "design", documentTemplateId: "tpl_doc_academic_rdd_v1", submissionEnabled: true },
          { key: "test-plan", title: "Test Plan", folderKey: "testing", documentTemplateId: "tpl_doc_academic_test_plan_v1", submissionEnabled: true },
          { key: "progress-report", title: "Weekly Progress Report", folderKey: "reports", documentTemplateId: "tpl_doc_academic_progress_v1", submissionEnabled: true },
          { key: "final-report", title: "Final Project Report", folderKey: "reports", documentTemplateId: "tpl_doc_academic_final_report_v1", submissionEnabled: true },
        ],
        taskBoard: {
          columns: [
            { key: "backlog", name: "Project Backlog", status: "backlog", position: 1024, description: "All planned tasks not yet started" },
            { key: "this-week", name: "This Week", status: "todo", position: 2048, description: "Tasks committed to for the current week" },
            { key: "in-progress", name: "In Progress", status: "in_progress", position: 3072, description: "Actively being worked on" },
            { key: "under-review", name: "Under Review", status: "in_review", position: 4096, description: "Completed — awaiting supervisor or peer review" },
            { key: "done", name: "Done", status: "done", position: 5120, description: "Completed and accepted" },
          ],
          defaultLabels: ["deliverable", "research", "implementation", "meeting", "review", "blocked"],
        },
      },
      "senior-project",
    ),

    workspace(
      "tpl_workspace_academic_research_thesis_v1",
      "academic",
      "Research Thesis",
      "For individual or small-group thesis work with advisor supervision.",
      {
        defaults: {
          workspaceSettings: { submissionWorkflowEnabled: true, allowViewerCommentsOnDocs: true },
          roleLabels: { OWNER: "Advisor", ADMIN: "Co-Advisor", MANAGER: "Lead Researcher", MEMBER: "Researcher", VIEWER: "Examiner" },
          taskLabels: [
            { name: "writing", color: "#7c3aed", description: "Thesis writing task" },
            { name: "research", color: "#0284c7", description: "Data collection or analysis" },
            { name: "experiment", color: "#059669", description: "Experimental work" },
            { name: "revision", color: "#dc2626", description: "Advisor-requested revision" },
            { name: "literature", color: "#d97706", description: "Literature review task" },
          ],
        },
        folders: [
          { key: "proposal", name: "Thesis Proposal", parentKey: null, icon: "📋" },
          { key: "literature", name: "Literature Review", parentKey: null, icon: "📚" },
          { key: "methodology", name: "Methodology", parentKey: null, icon: "🔬" },
          { key: "chapters", name: "Thesis Chapters", parentKey: null, icon: "📖" },
          { key: "data", name: "Data & Analysis", parentKey: null, icon: "📊" },
          { key: "meetings", name: "Advisor Meetings", parentKey: null, icon: "🗓️" },
        ],
        documents: [
          { key: "proposal", title: "Thesis Proposal", folderKey: "proposal", documentTemplateId: "tpl_doc_academic_thesis_proposal_v1", submissionEnabled: true },
          { key: "lit-review", title: "Literature Review", folderKey: "literature", documentTemplateId: "tpl_doc_academic_literature_review_v1", submissionEnabled: true },
          { key: "ch1-introduction", title: "Chapter 1 — Introduction", folderKey: "chapters", documentTemplateId: "tpl_doc_academic_thesis_chapter_v1", submissionEnabled: true },
          { key: "ch2-background", title: "Chapter 2 — Background & Related Work", folderKey: "chapters", documentTemplateId: "tpl_doc_academic_thesis_chapter_v1", submissionEnabled: true },
          { key: "ch3-methodology", title: "Chapter 3 — Methodology", folderKey: "methodology", documentTemplateId: "tpl_doc_academic_thesis_chapter_v1", submissionEnabled: true },
          { key: "ch4-results", title: "Chapter 4 — Results & Analysis", folderKey: "data", documentTemplateId: "tpl_doc_academic_thesis_chapter_v1", submissionEnabled: true },
          { key: "ch5-conclusion", title: "Chapter 5 — Conclusion", folderKey: "chapters", documentTemplateId: "tpl_doc_academic_thesis_chapter_v1", submissionEnabled: true },
          { key: "meeting-notes", title: "Advisor Meeting Notes", folderKey: "meetings", documentTemplateId: "tpl_doc_academic_meeting_minutes_v1" },
        ],
        taskBoard: {
          columns: [
            { key: "backlog", name: "Research Backlog", status: "backlog", position: 1024, description: "All pending research tasks" },
            { key: "todo", name: "Current Sprint", status: "todo", position: 2048, description: "Committed for this 2-week period" },
            { key: "in-progress", name: "In Progress", status: "in_progress", position: 3072, description: "Actively working" },
            { key: "advisor-review", name: "Advisor Review", status: "in_review", position: 4096, description: "Submitted to advisor for feedback" },
            { key: "done", name: "Completed", status: "done", position: 5120, description: "Advisor approved" },
          ],
          defaultLabels: ["writing", "research", "experiment", "revision", "literature"],
        },
      },
      "thesis",
    ),

    workspace(
      "tpl_workspace_academic_group_assignment_v1",
      "academic",
      "Group Assignment",
      "For semester-long course projects with lightweight instructor oversight.",
      {
        defaults: {
          workspaceSettings: { submissionWorkflowEnabled: true },
          roleLabels: { OWNER: "Instructor", ADMIN: "TA", MANAGER: "Team Lead", MEMBER: "Student", VIEWER: "Observer" },
          taskLabels: [
            { name: "task", color: "#0284c7", description: "Regular assignment task" },
            { name: "deliverable", color: "#7c3aed", description: "Graded deliverable" },
            { name: "bug", color: "#dc2626", description: "Bug or issue to fix" },
            { name: "question", color: "#d97706", description: "Question needing clarification" },
          ],
        },
        folders: [
          { key: "planning", name: "Planning", parentKey: null, icon: "📋" },
          { key: "deliverables", name: "Deliverables", parentKey: null, icon: "📝" },
          { key: "implementation", name: "Implementation", parentKey: null, icon: "💻" },
          { key: "meetings", name: "Meeting Notes", parentKey: null, icon: "🗓️" },
        ],
        documents: [
          { key: "project-plan", title: "Project Plan", folderKey: "planning", documentTemplateId: "tpl_doc_academic_project_plan_v1" },
          { key: "requirements", title: "Requirements Document", folderKey: "deliverables", documentTemplateId: "tpl_doc_academic_srs_v1", submissionEnabled: true },
          { key: "design-doc", title: "Design Document", folderKey: "deliverables", documentTemplateId: "tpl_doc_academic_rdd_v1", submissionEnabled: true },
          { key: "final-report", title: "Final Report", folderKey: "deliverables", documentTemplateId: "tpl_doc_academic_final_report_v1", submissionEnabled: true },
          { key: "meeting-notes", title: "Meeting Notes", folderKey: "meetings", documentTemplateId: "tpl_doc_academic_meeting_minutes_v1" },
        ],
        taskBoard: {
          columns: [
            { key: "backlog", name: "Backlog", status: "backlog", position: 1024, description: "All project tasks" },
            { key: "todo", name: "To Do", status: "todo", position: 2048, description: "Assigned and ready to start" },
            { key: "in-progress", name: "In Progress", status: "in_progress", position: 3072, description: "Being worked on" },
            { key: "review", name: "Review", status: "in_review", position: 4096, description: "Peer review or team check" },
            { key: "done", name: "Done", status: "done", position: 5120, description: "Submitted or complete" },
          ],
          defaultLabels: ["task", "deliverable", "bug", "question"],
        },
      },
      "group-assignment",
    ),

    workspace(
      "tpl_workspace_academic_lab_assignment_v1",
      "academic",
      "Lab Assignment",
      "For short lab sessions, practicals, and hands-on assignments.",
      {
        defaults: {
          workspaceSettings: { submissionWorkflowEnabled: true, allowViewerCommentsOnDocs: false },
          roleLabels: { OWNER: "Instructor", ADMIN: "TA", MANAGER: "Student Lead", MEMBER: "Student", VIEWER: "Observer" },
          taskLabels: [
            { name: "lab-task", color: "#059669", description: "Lab exercise task" },
            { name: "question", color: "#d97706", description: "Question or clarification needed" },
          ],
        },
        folders: [
          { key: "lab-notes", name: "Lab Notes", parentKey: null, icon: "🧪" },
          { key: "submissions", name: "Submissions", parentKey: null, icon: "📤" },
        ],
        documents: [
          { key: "lab-report", title: "Lab Report", folderKey: "submissions", documentTemplateId: "tpl_doc_academic_lab_report_v1", submissionEnabled: true },
          { key: "notes", title: "Lab Notes", folderKey: "lab-notes", documentTemplateId: "tpl_doc_general_blank_v1" },
        ],
        taskBoard: {
          columns: [
            { key: "todo", name: "To Do", status: "todo", position: 1024, description: "Lab tasks to complete" },
            { key: "in-progress", name: "In Progress", status: "in_progress", position: 2048, description: "Currently working" },
            { key: "submitted", name: "Submitted", status: "in_review", position: 3072, description: "Submitted for review" },
            { key: "done", name: "Marked", status: "done", position: 4096, description: "Marked and returned" },
          ],
          defaultLabels: ["lab-task", "question"],
        },
      },
      "lab-assignment",
    ),

    workspace(
      "tpl_workspace_professional_software_project_v1",
      "professional",
      "Software Development Project",
      "For product teams building software — from discovery to delivery.",
      {
        defaults: {
          workspaceSettings: { submissionWorkflowEnabled: false, allowViewerCommentsOnDocs: true, allowViewerExport: false },
          roleLabels: { OWNER: "Owner", ADMIN: "Engineering Manager", MANAGER: "Tech Lead", MEMBER: "Developer", VIEWER: "Stakeholder" },
          taskLabels: [
            { name: "feature", color: "#059669", description: "New feature or user story" },
            { name: "bug", color: "#dc2626", description: "Bug or defect to fix" },
            { name: "chore", color: "#6b7280", description: "Technical debt or maintenance" },
            { name: "spike", color: "#0284c7", description: "Research or exploration task" },
            { name: "blocked", color: "#9ca3af", description: "Blocked by dependency or decision" },
            { name: "p0", color: "#dc2626", description: "Critical priority — must fix now" },
            { name: "p1", color: "#d97706", description: "High priority" },
            { name: "good-first-issue", color: "#7c3aed", description: "Good for new contributors" },
          ],
          onboardingDocKey: "workspace-guide",
        },
        folders: [
          { key: "product", name: "Product", parentKey: null, icon: "🎯" },
          { key: "engineering", name: "Engineering", parentKey: null, icon: "⚙️" },
          { key: "architecture", name: "Architecture", parentKey: "engineering", icon: "🏗️" },
          { key: "adrs", name: "Architecture Decisions", parentKey: "architecture", icon: "📋" },
          { key: "runbooks", name: "Runbooks", parentKey: "engineering", icon: "📖" },
          { key: "processes", name: "Processes", parentKey: null, icon: "🔄" },
          { key: "retrospectives", name: "Retrospectives", parentKey: "processes", icon: "🔁" },
          { key: "meetings", name: "Meeting Notes", parentKey: "processes", icon: "🗓️" },
          { key: "design", name: "Design", parentKey: null, icon: "🎨" },
          { key: "onboarding", name: "Onboarding", parentKey: null, icon: "👋" },
        ],
        documents: [
          { key: "workspace-guide", title: "👋 Getting Started", folderKey: "onboarding", documentTemplateId: "tpl_doc_professional_workspace_guide_v1" },
          { key: "tech-stack", title: "Tech Stack & Architecture Overview", folderKey: "onboarding", documentTemplateId: "tpl_doc_professional_tech_overview_v1" },
          { key: "prd", title: "Product Requirements Document (PRD)", folderKey: "product", documentTemplateId: "tpl_doc_professional_prd_v1" },
          { key: "roadmap", title: "Product Roadmap", folderKey: "product", documentTemplateId: "tpl_doc_professional_roadmap_v1" },
          { key: "system-design", title: "System Design Overview", folderKey: "architecture", documentTemplateId: "tpl_doc_professional_tdd_v1" },
          { key: "adr-001", title: "ADR-001: [First Decision]", folderKey: "adrs", documentTemplateId: "tpl_doc_professional_adr_v1" },
          { key: "retro-template", title: "Sprint Retrospective", folderKey: "retrospectives", documentTemplateId: "tpl_doc_professional_retro_v1" },
          { key: "meeting-template", title: "Meeting Notes", folderKey: "meetings", documentTemplateId: "tpl_doc_professional_meeting_v1" },
          { key: "incident-postmortem", title: "Incident Postmortem", folderKey: "processes", documentTemplateId: "tpl_doc_professional_postmortem_v1" },
        ],
        taskBoard: {
          columns: [
            { key: "backlog", name: "Backlog", status: "backlog", position: 1024, description: "Groomed and prioritized, not yet scheduled" },
            { key: "todo", name: "Sprint", status: "todo", position: 2048, description: "Committed to current sprint" },
            { key: "in-progress", name: "In Progress", status: "in_progress", position: 3072, description: "Actively being worked on" },
            { key: "pr-review", name: "PR / Review", status: "in_review", position: 4096, description: "Code review or design review" },
            { key: "done", name: "Done", status: "done", position: 5120, description: "Merged, deployed, or approved" },
          ],
          defaultLabels: ["feature", "bug", "chore", "spike", "blocked", "p0", "p1", "good-first-issue"],
        },
      },
      "software-project",
    ),

    workspace(
      "tpl_workspace_professional_sprint_v1",
      "professional",
      "Sprint Workspace",
      "Focused short-cycle delivery workspace — one sprint, one goal.",
      {
        defaults: {
          workspaceSettings: { submissionWorkflowEnabled: false },
          roleLabels: { OWNER: "Product Owner", ADMIN: "Engineering Lead", MANAGER: "Scrum Master", MEMBER: "Developer", VIEWER: "Stakeholder" },
          taskLabels: [
            { name: "story", color: "#059669", description: "User story" },
            { name: "bug", color: "#dc2626", description: "Bug" },
            { name: "spike", color: "#0284c7", description: "Research spike" },
            { name: "blocked", color: "#9ca3af", description: "Blocked" },
          ],
        },
        folders: [
          { key: "sprint-docs", name: "Sprint Documents", parentKey: null, icon: "📋" },
          { key: "technical", name: "Technical Notes", parentKey: null, icon: "⚙️" },
        ],
        documents: [
          { key: "sprint-goal", title: "Sprint Goal & Scope", folderKey: "sprint-docs", documentTemplateId: "tpl_doc_professional_sprint_scope_v1" },
          { key: "daily-standup", title: "Daily Standup Notes", folderKey: "sprint-docs", documentTemplateId: "tpl_doc_professional_standup_v1" },
          { key: "retro", title: "Sprint Retrospective", folderKey: "sprint-docs", documentTemplateId: "tpl_doc_professional_retro_v1" },
          { key: "tech-notes", title: "Technical Notes", folderKey: "technical", documentTemplateId: "tpl_doc_general_blank_v1" },
        ],
        taskBoard: {
          columns: [
            { key: "sprint-backlog", name: "Sprint Backlog", status: "backlog", position: 1024, description: "Committed to this sprint, not started" },
            { key: "in-progress", name: "In Progress", status: "in_progress", position: 2048, description: "Actively working" },
            { key: "review", name: "Review / Testing", status: "in_review", position: 3072, description: "Ready for review or QA" },
            { key: "done", name: "Done ✓", status: "done", position: 4096, description: "Meets definition of done" },
          ],
          defaultLabels: ["story", "bug", "spike", "blocked"],
        },
      },
      "sprint",
    ),

    workspace(
      "tpl_workspace_professional_client_project_v1",
      "professional",
      "Client Project",
      "For agencies and freelancers managing a client engagement.",
      {
        defaults: {
          workspaceSettings: { submissionWorkflowEnabled: false, allowViewerCommentsOnDocs: true, allowViewerExport: true },
          roleLabels: { OWNER: "Project Manager", ADMIN: "Account Manager", MANAGER: "Tech Lead", MEMBER: "Team Member", VIEWER: "Client" },
          taskLabels: [
            { name: "client-request", color: "#7c3aed", description: "Request from client" },
            { name: "deliverable", color: "#059669", description: "Client deliverable" },
            { name: "internal", color: "#6b7280", description: "Internal team work" },
            { name: "bug", color: "#dc2626", description: "Bug or issue" },
            { name: "feedback-needed", color: "#d97706", description: "Needs client feedback" },
          ],
        },
        folders: [
          { key: "client-facing", name: "Client Documents", parentKey: null, icon: "👤" },
          { key: "internal", name: "Internal", parentKey: null, icon: "🔒" },
          { key: "deliverables", name: "Deliverables", parentKey: "client-facing", icon: "📦" },
          { key: "meetings", name: "Meeting Notes", parentKey: "client-facing", icon: "🗓️" },
        ],
        documents: [
          { key: "project-brief", title: "Project Brief", folderKey: "client-facing", documentTemplateId: "tpl_doc_professional_project_brief_v1" },
          { key: "scope-of-work", title: "Scope of Work", folderKey: "client-facing", documentTemplateId: "tpl_doc_professional_scope_of_work_v1" },
          { key: "client-meeting", title: "Client Meeting Notes", folderKey: "meetings", documentTemplateId: "tpl_doc_professional_meeting_v1" },
          { key: "internal-plan", title: "Internal Project Plan", folderKey: "internal", documentTemplateId: "tpl_doc_professional_prd_v1" },
        ],
        taskBoard: {
          columns: [
            { key: "requested", name: "Requested", status: "backlog", position: 1024, description: "Client or team requests, not yet started" },
            { key: "in-progress", name: "In Progress", status: "in_progress", position: 2048, description: "Team is working on it" },
            { key: "client-review", name: "Client Review", status: "in_review", position: 3072, description: "Waiting for client feedback" },
            { key: "approved", name: "Approved", status: "done", position: 4096, description: "Client approved" },
          ],
          defaultLabels: ["client-request", "deliverable", "internal", "bug", "feedback-needed"],
        },
      },
      "client-project",
    ),

    workspace(
      "tpl_workspace_professional_open_source_v1",
      "professional",
      "Open Source Project",
      "For open source maintainers — documentation, roadmap, and contributor onboarding.",
      {
        defaults: {
          workspaceSettings: { allowViewerCommentsOnDocs: true, allowViewerExport: true },
          roleLabels: { OWNER: "Maintainer", ADMIN: "Core Team Lead", MANAGER: "Core Contributor", MEMBER: "Contributor", VIEWER: "Community" },
          taskLabels: [
            { name: "enhancement", color: "#059669", description: "New feature or improvement" },
            { name: "bug", color: "#dc2626", description: "Something is broken" },
            { name: "docs", color: "#0284c7", description: "Documentation improvement" },
            { name: "good-first-issue", color: "#7c3aed", description: "Great for first-time contributors" },
            { name: "help-wanted", color: "#d97706", description: "Needs community help" },
          ],
        },
      folders: [
          { key: "docs", name: "Documentation", parentKey: null, icon: "📚" },
          { key: "architecture", name: "Architecture", parentKey: null, icon: "🏗️" },
          { key: "rfcs", name: "RFCs", parentKey: null, icon: "📋" },
          { key: "contributing", name: "Contributing", parentKey: null, icon: "🤝" },
          { key: "releases", name: "Releases", parentKey: null, icon: "🏷️" },
      ],
      documents: [
          { key: "readme", title: "Project Overview (README)", folderKey: "docs", documentTemplateId: "tpl_doc_professional_readme_v1" },
          { key: "contributing", title: "Contributing Guide", folderKey: "contributing", documentTemplateId: "tpl_doc_professional_contributing_v1" },
          { key: "code-of-conduct", title: "Code of Conduct", folderKey: "contributing", documentTemplateId: "tpl_doc_professional_coc_v1" },
          { key: "architecture", title: "Architecture Overview", folderKey: "architecture", documentTemplateId: "tpl_doc_professional_tdd_v1" },
          { key: "rfc-template", title: "RFC-001: [Title]", folderKey: "rfcs", documentTemplateId: "tpl_doc_professional_rfc_v1" },
          { key: "changelog", title: "Changelog", folderKey: "releases", documentTemplateId: "tpl_doc_professional_changelog_v1" },
        ],
        taskBoard: {
          columns: [
            { key: "backlog", name: "Backlog", status: "backlog", position: 1024, description: "Ideas and reported issues" },
            { key: "todo", name: "Ready", status: "todo", position: 2048, description: "Ready to implement" },
            { key: "in-progress", name: "In Progress", status: "in_progress", position: 3072, description: "In development" },
            { key: "review", name: "Review", status: "in_review", position: 4096, description: "PR review" },
            { key: "done", name: "Done", status: "done", position: 5120, description: "Merged / released" },
          ],
          defaultLabels: ["enhancement", "bug", "docs", "good-first-issue", "help-wanted"],
        },
      },
      "open-source",
    ),

    workspace(
      "tpl_workspace_general_blank_v1",
      "general",
      "Blank Workspace",
      "A clean, minimal workspace with no pre-defined structure.",
      {
        defaults: {
          workspaceSettings: { submissionWorkflowEnabled: false },
          roleLabels: { OWNER: "You", ADMIN: "Admin", MANAGER: "Collaborator", MEMBER: "Contributor", VIEWER: "Guest" },
          taskLabels: [],
        },
        folders: defaultFolders,
        documents: [{ key: "welcome", title: "Welcome", folderKey: "root-docs", documentTemplateId: "tpl_doc_general_blank_v1" }],
        taskBoard: { columns: [{ key: "todo", name: "Todo", status: "todo", position: 1024, description: "Things to do" }], defaultLabels: [] },
      },
      "blank",
    ),

    workspace(
      "tpl_workspace_general_personal_v1",
      "general",
      "Personal Workspace",
      "Your personal workspace for notes, ideas, and tasks.",
      {
        defaults: {
          workspaceSettings: { submissionWorkflowEnabled: false },
          roleLabels: { OWNER: "You", ADMIN: "Admin", MANAGER: "Collaborator", MEMBER: "Contributor", VIEWER: "Guest" },
          taskLabels: [
            { name: "personal", color: "#7c3aed", description: "Personal task" },
            { name: "work", color: "#059669", description: "Work-related" },
            { name: "idea", color: "#d97706", description: "Idea to explore" },
            { name: "urgent", color: "#dc2626", description: "Urgent" },
          ],
        },
        folders: [
          { key: "notes", name: "Notes", parentKey: null, icon: "📝" },
          { key: "projects", name: "Projects", parentKey: null, icon: "🎯" },
          { key: "archive", name: "Archive", parentKey: null, icon: "📦" },
        ],
        documents: [
          { key: "journal", title: "Daily Journal", folderKey: "notes", documentTemplateId: "tpl_doc_general_blank_v1" },
          { key: "ideas", title: "Ideas & Brainstorm", folderKey: "notes", documentTemplateId: "tpl_doc_general_blank_v1" },
          { key: "reading-list", title: "Reading List", folderKey: "notes", documentTemplateId: "tpl_doc_general_reading_list_v1" },
        ],
        taskBoard: {
          columns: [
            { key: "someday", name: "Someday", status: "backlog", position: 1024, description: "Ideas and future tasks" },
            { key: "this-week", name: "This Week", status: "todo", position: 2048, description: "This week's commitments" },
            { key: "today", name: "Today", status: "in_progress", position: 3072, description: "Today's focus" },
            { key: "done", name: "Done", status: "done", position: 4096, description: "Completed" },
          ],
          defaultLabels: ["personal", "work", "idea", "urgent"],
        },
      },
      "personal",
    ),
  ];

  const documentTemplates = [
    // General blanks used as placeholders in workspace templates.
    blankDocumentTemplate({
      id: "tpl_doc_general_blank_v1",
      category: "general",
      name: "Blank Document",
      description: "Empty placeholder document (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_general_reading_list_v1",
      category: "general",
      name: "Reading List",
      description: "Reading list placeholder (content to be added later).",
    }),

    // Academic templates referenced by workspace templates (blank placeholders for now).
    blankDocumentTemplate({
      id: "tpl_doc_academic_workspace_guide_v1",
      category: "academic",
      name: "How to Use This Workspace (Academic)",
      description: "Academic workspace guide placeholder (content to be added later).",
      subCategory: "onboarding",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_team_charter_v1",
      category: "academic",
      name: "Team Charter & Agreements",
      description: "Team charter placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_meeting_minutes_v1",
      category: "academic",
      name: "Meeting Minutes",
      description: "Meeting minutes placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_literature_review_v1",
      category: "academic",
      name: "Literature Review",
      description: "Literature review placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_test_plan_v1",
      category: "academic",
      name: "Test Plan",
      description: "Test plan placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_project_plan_v1",
      category: "academic",
      name: "Project Plan",
      description: "Project plan placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_thesis_proposal_v1",
      category: "academic",
      name: "Thesis Proposal",
      description: "Thesis proposal placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_thesis_chapter_v1",
      category: "academic",
      name: "Thesis Chapter",
      description: "Thesis chapter placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_lab_report_v1",
      category: "academic",
      name: "Lab Report",
      description: "Lab report placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_proposal_v1",
      category: "academic",
      name: "Project Proposal",
      description: "Project proposal placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_rad_v1",
      category: "academic",
      name: "Requirement Analysis Document (RAD)",
      description: "RAD placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_rdd_v1",
      category: "academic",
      name: "Requirement Design Document (RDD)",
      description: "RDD placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_progress_v1",
      category: "academic",
      name: "Weekly Progress Report",
      description: "Progress report placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_final_report_v1",
      category: "academic",
      name: "Final Project Report",
      description: "Final report placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_academic_srs_v1",
      category: "academic",
      name: "Requirements Document (SRS)",
      description: "SRS placeholder (content to be added later).",
    }),

    // Professional templates referenced by workspace templates (blank placeholders for now).
    blankDocumentTemplate({
      id: "tpl_doc_professional_workspace_guide_v1",
      category: "professional",
      name: "Getting Started (Professional)",
      description: "Professional workspace guide placeholder (content to be added later).",
      subCategory: "onboarding",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_tech_overview_v1",
      category: "professional",
      name: "Tech Stack Overview",
      description: "Tech overview placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_prd_v1",
      category: "professional",
      name: "Product Requirements Document (PRD)",
      description: "PRD placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_roadmap_v1",
      category: "professional",
      name: "Product Roadmap",
      description: "Roadmap placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_tdd_v1",
      category: "professional",
      name: "Technical Design Document",
      description: "TDD placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_adr_v1",
      category: "professional",
      name: "ADR",
      description: "ADR placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_retro_v1",
      category: "professional",
      name: "Sprint Retrospective",
      description: "Retro placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_meeting_v1",
      category: "professional",
      name: "Meeting Notes",
      description: "Meeting notes placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_postmortem_v1",
      category: "professional",
      name: "Incident Postmortem",
      description: "Postmortem placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_standup_v1",
      category: "professional",
      name: "Daily Standup Notes",
      description: "Standup placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_sprint_scope_v1",
      category: "professional",
      name: "Sprint Goal & Scope",
      description: "Sprint scope placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_project_brief_v1",
      category: "professional",
      name: "Project Brief",
      description: "Project brief placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_scope_of_work_v1",
      category: "professional",
      name: "Scope of Work",
      description: "SOW placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_readme_v1",
      category: "professional",
      name: "Project README",
      description: "README placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_contributing_v1",
      category: "professional",
      name: "Contributing Guide",
      description: "Contributing placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_coc_v1",
      category: "professional",
      name: "Code of Conduct",
      description: "CoC placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_changelog_v1",
      category: "professional",
      name: "Changelog",
      description: "Changelog placeholder (content to be added later).",
    }),
    blankDocumentTemplate({
      id: "tpl_doc_professional_rfc_v1",
      category: "professional",
      name: "RFC",
      description: "RFC placeholder (content to be added later).",
    }),

    doc(
      "meeting-notes",
      "general",
      "Meeting notes",
      "Agenda, notes, and action items.",
      ["heading", "bulletList", "paragraph"],
      [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Meeting title" }] },
        { type: "paragraph", content: [{ type: "text", text: "Date / attendees" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Agenda" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Agenda item" }],
                },
              ],
            },
          ],
        },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Notes" }] },
        { type: "paragraph", content: [{ type: "text", text: "Discussion notes…" }] },
      ],
    ),
    doc(
      "project-brief",
      "professional",
      "Project brief",
      "Goals, scope, and stakeholders.",
      ["heading", "paragraph", "bulletList"],
      [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Project brief" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Summary" }] },
        { type: "paragraph", content: [{ type: "text", text: "One paragraph summary." }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Goals" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Goal 1" }] },
              ],
            },
          ],
        },
      ],
    ),
    doc(
      "thesis-chapter",
      "academic",
      "Thesis chapter",
      "Chapter scaffold with required sections.",
      ["heading", "paragraph"],
      [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Chapter title" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Introduction" }] },
        { type: "paragraph", content: [{ type: "text", text: "Intro text…" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Analysis" }] },
        { type: "paragraph", content: [{ type: "text", text: "Analysis text…" }] },
      ],
    ),
    doc(
      "coursework-assignment",
      "academic",
      "Coursework assignment",
      "Prompt, deliverables, and rubric notes.",
      ["heading", "paragraph", "bulletList"],
      [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Assignment" }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Instructions" }] },
        { type: "paragraph", content: [{ type: "text", text: "Describe the coursework task." }] },
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Deliverables" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Deliverable 1" }] },
              ],
            },
          ],
        },
      ],
    ),
    {
      id: "general-richdocument-pilot",
      kind: "document",
      category: "general",
      subCategory: "pilot",
      scope: "system",
      name: "Rich document (pilot)",
      description: "Phase T1 richdocument template with variables (smoke test).",
      version: 1,
      schemaVersion: 2,
      contentFormat: "richdocument",
      isEnabled: true,
      content: {
        schemaVersion: 2,
        format: "richdocument",
        metadata: { title: "Rich document (pilot)", kind: "document" },
        properties: {},
        structure: {
          regions: [{ id: "main", key: "main", title: "Main content" }],
          variables: [{ key: "docTitle", label: "Document title", required: false }],
          blocks: [],
        },
      },
    },
  ];

  for (const row of [...workspaceTemplates, ...documentTemplates]) {
    await prisma.template.upsert({
      where: { id: row.id },
      create: row,
      update: {
        name: row.name,
        description: row.description,
        content: row.content,
        kind: row.kind,
        category: row.category,
        subCategory: row.subCategory,
        version: row.version,
        schemaVersion: row.schemaVersion,
        contentFormat: row.contentFormat,
        isEnabled: row.isEnabled,
      },
    });
  }

  console.log(`Seeded ${workspaceTemplates.length} workspace + ${documentTemplates.length} document templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
