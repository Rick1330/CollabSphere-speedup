# API Contract Validation
## Purpose
Ensure that REST endpoints strictly adhere to the project's canonical API standards and response shapes.
## Canonical Requirements
- **Response Envelope**: All success responses must use the project's standard envelope (`{ "data": ..., "meta": { "requestId", "timestamp" } }`).
- **Error Shape**: All error responses must use `CanonicalErrorCode` and follow the error envelope.
- **Pagination**: Paginated lists must include a `pagination` object in the meta with `total`, `page`, and `pageSize`.
- **Field Naming**: CamelCase for JSON keys, snake_case for database columns.
- **HTTP Methods**: Proper use of POST (create), PUT (replace), PATCH (partial update), DELETE (soft delete).
## Workflow
1. Use a tool like `supertest` to verify the response body structure.
2. Confirm that `x-request-id` is present in the response headers.
3. Validate that Date strings follow ISO 8601.
