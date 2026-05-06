# Edge Cases Validation

## Purpose
Catch the scenario classes most likely to be skipped in happy-path
implementation work.

## Universal Checklist
- [ ] Empty state (zero items)
- [ ] Single item
- [ ] Pagination boundary (page N, page N+1, page 0, page -1)
- [ ] Expired token or session
- [ ] Soft-deleted entity
- [ ] Race condition or double-submit
- [ ] Network timeout or retry path
- [ ] Rate-limit hit
- [ ] Payload size limit
- [ ] Malformed input (`null`, `undefined`, empty string, wrong type,
      XSS/SQLi-shaped input)
- [ ] Permission boundary (member vs non-member, wrong workspace)
- [ ] Cascade impact after soft delete or archival

## Evidence To Capture
- Which edge cases were explicitly tested
- Which were deferred and why
