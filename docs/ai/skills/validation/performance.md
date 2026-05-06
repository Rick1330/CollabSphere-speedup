# Performance Validation

## Purpose
Catch avoidable latency, rendering, and scaling regressions before they
ship.

## Universal Checklist
- [ ] No obvious N+1 query pattern was introduced
- [ ] Hot paths reuse existing indexes or documented access patterns
- [ ] Large lists use pagination, windowing, or bounded loading
- [ ] Realtime/event emission avoids per-keystroke fan-out unless the
      surface is explicitly designed for it
- [ ] Frontend rerenders are bounded for the interaction
- [ ] Expensive derived calculations are not repeated unnecessarily on
      every render
- [ ] Search/filter/group logic remains plausible for real workspace
      sizes

## Evidence To Capture
- Commands, profiling notes, or reasoning for hot-path changes
- Any known performance debt left in place intentionally
