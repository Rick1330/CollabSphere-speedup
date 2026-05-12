# Edge Cases Validation
## Purpose
Ensure that new features or refactors handle common and exceptional scenarios beyond the "happy path."
## Universal Checklist
- [ ] **Empty State**: Zero items returned or present in a collection.
- [ ] **Single Item**: Exactly one item in a collection.
- [ ] **Pagination Boundary**: Requesting page N, page N+1, page 0, and page -1.
- [ ] **Expired Session**: Action attempted with an expired or invalid token.
- [ ] **Soft-Deleted Entity**: Attempting to access or mutate a record marked as deleted.
- [ ] **Race Condition**: Two concurrent requests for the same resource or state change.
- [ ] **Network/Dependency Timeout**: External service (Redis, DB, S3) is slow or unreachable.
- [ ] **Rate Limit**: User has exceeded their allowed request threshold.
- [ ] **Payload Limits**: Request payload is empty, oversized, or contains malformed JSON.
- [ ] **Input Sanitization**: Malformed input strings (null, undefined, "", SQL injection attempts, XSS).
- [ ] **Soft-Delete Cascade**: Verifying that references to a deleted entity are handled correctly (nullified or blocked).
## Workflow
1. Identify the input and output boundaries of the change.
2. Cross-check against the checklist above.
3. Write automated tests for at least 3 relevant edge cases.
