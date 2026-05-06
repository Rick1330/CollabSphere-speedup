# UI Contract Validation

## Purpose
Validate that frontend changes preserve the intended route, state, and
interaction contract.

## Universal Checklist
- [ ] Loading, empty, populated, and error states all exist
- [ ] Keyboard navigation still works for the surface
- [ ] Focus handling is coherent after actions and dialogs
- [ ] Responsive behavior remains usable on narrower widths
- [ ] UI imports data through adapters/contracts, not direct mock files
- [ ] Role or permission gating is visibly correct
- [ ] No visible overlap, truncation, or broken layout in key states
- [ ] Surface still matches the current product shell and interaction
      model

## Evidence To Capture
- Tests run
- Screens examined or screenshots taken
- States manually exercised

## Related References
- `apps/web/AGENTS.md`
- `docs/spec/03-information-architecture/*`
