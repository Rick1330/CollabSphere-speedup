# UI Contract Validation
## Purpose
Ensure that frontend components and pages handle all server states correctly and maintain visual/behavioral consistency.
## Checklist
- [ ] **Loading States**: Skeletons or spinners shown while data is in flight.
- [ ] **Empty States**: Clear messaging when a collection has zero items.
- [ ] **Error Handling**: API errors are caught and displayed via Toast or inline messages (not just console.logs).
- [ ] **Optimistic Updates**: UI updates immediately on action, with a rollback mechanism on server failure.
- [ ] **Responsive Design**: Component works on mobile, tablet, and desktop (breakpoints).
- [ ] **Accessibility (A11y)**: WCAG 2.1 AA baseline (proper labels, ARIA roles, keyboard navigation).
- [ ] **Form Validation**: Client-side validation matches server-side constraints (Zod/React-Hook-Form).
## Workflow
1. Run the local dev server.
2. Manually trigger error states by mocking failed API responses.
3. Verify accessibility using a plugin (e.g., Axe) or keyboard-only navigation.
