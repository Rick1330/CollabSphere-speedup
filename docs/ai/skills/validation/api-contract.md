# API Contract Validation

## Purpose
Validate that backend changes still honor the documented HTTP contract.

## Universal Checklist
- [ ] Request and response shapes match the documented contract
- [ ] Standard response envelope is preserved
- [ ] Canonical error codes are used
- [ ] Status codes match the documented behavior or an ADR-backed
      override
- [ ] Pagination semantics are stable where applicable
- [ ] Idempotent endpoints remain idempotent
- [ ] Required auth and workspace-scope checks still run
- [ ] Negative-path responses are explicit and non-enumerating where
      required

## Evidence To Capture
- Commands run
- Sample endpoint behavior
- Any ADRs relied on for local exceptions

## Related References
- `docs/spec/09-api-standards/*`
- `docs/agent-ref/api/*`
- `docs/agent-ref/rules/error-codes.md`
