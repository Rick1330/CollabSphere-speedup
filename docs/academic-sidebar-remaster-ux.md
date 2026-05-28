# Academic Sidebar UX Spec

## Reviewer Experience

Reviewers should feel in control within seconds of opening the sidebar tab.
The panel should surface urgency first, decision context second, and actions third.
Every decision should be possible without leaving the sidebar.

Expected reviewer flow:

1. Open `Review` tab and immediately see pending state and age.
2. Read submitter note and last activity in compact cards.
3. Choose `Approve` or `Request changes` with clear note requirements.
4. See live updates without page reload when submissions change.

## Submitter Experience

Submitters should feel clarity, not ambiguity: what happened, who reviewed, and what to do next.
The panel should always communicate current status and next step.

Expected submitter flow:

1. Open `Submissions` tab and see latest status at top.
2. Read reviewer feedback in a dedicated feedback block.
3. Review timeline history with actor, time, and decision note.
4. Resubmit from the same panel when changes are requested.

## Visual Language

- Compact density tuned for narrow sidebar width.
- Stable section order: status -> actions -> context/history.
- Metadata chips for version, decision, and urgency.
- Soft pulse only when counts increase.
- Empty states with explicit next actions.

## ASCII Wireframes

### Left Rail Tabs

```text
+--------+
| Files  |
| Pages  |
|Outline |
|Bookmark|
| Stats  |
|--------|
| Review |  (reviewer only)
|   2*   |  *badge + glow on new items
| Submit |  (submitter only)
|   1*   |
+--------+
```

### Review Sidebar Panel

```text
+----------------------------------+
| REVIEW QUEUE                     |
| Pending: 2    Overdue: 1         |
|----------------------------------|
| [v4] [Submitted 12m ago] [HOT]   |
| Doc: Literature Review           |
| By: Selam Desta                  |
| Note: "Please focus on methods"  |
|----------------------------------|
| Decision note (required for req) |
| [ textarea..................... ]|
|                                  |
| [Request changes]   [Approve]    |
|----------------------------------|
| Recent activity                  |
| - comment thread reopened (now)  |
| - new submission in workspace    |
+----------------------------------+
```

### Submission Sidebar Panel

```text
+----------------------------------+
| SUBMISSION CENTER                |
| Status: Changes requested        |
| Reviewer: Eyob Bekele            |
| Updated: 5m ago                  |
|----------------------------------|
| Feedback                         |
| "Clarify sampling and citations" |
|----------------------------------|
| Submission history               |
| v4  CHANGES   by Reviewer   5m   |
| v3  APPROVED  by Reviewer   2d   |
| v2  PENDING   submitted     3d   |
|----------------------------------|
| [Resubmit for review]            |
+----------------------------------+
```

### Badge + Glow State

```text
idle:      [Review]
new event: [Review](3)  <- soft pulse for 2s
seen tab:  [Review](3)  <- pulse removed, badge remains
```
