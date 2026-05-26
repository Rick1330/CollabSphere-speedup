import { recreateTransform } from "@manuscripts/prosemirror-recreate-steps";
import { ChangeSet, simplifyChanges, type Change } from "prosemirror-changeset";
import type { Node as PmNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type VersionDiffSummary = {
  insertions: number;
  deletions: number;
  modifications: number;
};

export type VersionDiffResult = {
  changes: readonly Change[];
  failed: boolean;
};

export function getChangesBetween(oldDoc: PmNode, newDoc: PmNode): VersionDiffResult {
  if (oldDoc.eq(newDoc)) {
    return { changes: [], failed: false };
  }
  try {
    const tr = recreateTransform(oldDoc, newDoc, true, false);
    if (tr.steps.length === 0) {
      return { changes: [], failed: false };
    }
    const cs = ChangeSet.create(oldDoc).addSteps(tr.doc, tr.mapping.maps, null);
    return { changes: simplifyChanges(cs.changes, newDoc), failed: false };
  } catch {
    return { changes: [], failed: true };
  }
}

export function summarizeVersionDiff(oldDoc: PmNode, newDoc: PmNode): VersionDiffSummary {
  const summary: VersionDiffSummary = { insertions: 0, deletions: 0, modifications: 0 };
  const { changes } = getChangesBetween(oldDoc, newDoc);
  for (const change of changes) {
    const inserted = change.fromA === change.toA;
    const deleted = change.fromB === change.toB;
    if (inserted && !deleted) summary.insertions += 1;
    else if (deleted && !inserted) summary.deletions += 1;
    else summary.modifications += 1;
  }
  return summary;
}

export function buildVersionDiffDecorations(
  oldDoc: PmNode,
  newDoc: PmNode,
): { decorations: DecorationSet; failed: boolean } {
  const decorations: Decoration[] = [];
  const { changes, failed } = getChangesBetween(oldDoc, newDoc);
  if (failed) {
    return { decorations: DecorationSet.empty, failed: true };
  }

  try {
    for (const change of changes) {
      const inserted = change.fromA === change.toA;
      const deleted = change.fromB === change.toB;

      if (inserted && !deleted && change.toB > change.fromB) {
        decorations.push(
          Decoration.inline(change.fromB, change.toB, {
            class: "version-diff-insert",
          }),
        );
        continue;
      }

      if (deleted && !inserted && change.toA > change.fromA) {
        const deletedText = oldDoc.textBetween(change.fromA, change.toA, " ");
        const span = document.createElement("span");
        span.className = "version-diff-delete";
        span.textContent = deletedText || " ";
        decorations.push(
          Decoration.widget(change.fromB, span, { side: -1, marks: [] }),
        );
        continue;
      }

      if (!inserted && !deleted && change.toB > change.fromB) {
        decorations.push(
          Decoration.inline(change.fromB, change.toB, {
            class: "version-diff-modify",
          }),
        );
      }
    }
  } catch {
    return { decorations: DecorationSet.empty, failed: true };
  }

  return {
    decorations:
      decorations.length > 0
        ? DecorationSet.create(newDoc, decorations)
        : DecorationSet.empty,
    failed: false,
  };
}
