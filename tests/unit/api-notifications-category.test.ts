import assert from "node:assert/strict";
import test from "node:test";

import {
  categoryTypeFilter,
  notificationMatchesCategory,
} from "../../apps/api/src/notifications/notifications-category.js";

test("comments category matches comment.* notification types", () => {
  assert.ok(notificationMatchesCategory("comment.mention", "comments"));
  assert.ok(notificationMatchesCategory("comment.reply", "comments"));
  assert.equal(notificationMatchesCategory("comments.mention", "comments"), false);
  assert.equal(notificationMatchesCategory("document.mention", "comments"), false);
});

test("documents category matches document.* only", () => {
  assert.ok(notificationMatchesCategory("document.mention", "documents"));
  assert.equal(notificationMatchesCategory("comment.mention", "documents"), false);
});

test("categoryTypeFilter builds OR startsWith clauses for comments", () => {
  const filter = categoryTypeFilter("comments");
  assert.ok(filter);
  assert.deepEqual(filter, {
    OR: [{ type: { startsWith: "comment." } }],
  });
});
