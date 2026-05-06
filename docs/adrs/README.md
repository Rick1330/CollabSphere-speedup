# Architecture Decision Records

## Purpose
This directory stores one ADR per file.
Each ADR captures a durable architectural or contract decision that
future contributors and agents must respect.

## Required ADR sections
- Context
- Decision
- Consequences
- Alternatives considered

## Numbering
- Use zero-padded numeric prefixes: `0001-...`, `0002-...`
- Do not renumber old ADRs after merge

## When an ADR is required
- A documented default is intentionally overridden
- A new cross-cutting architecture choice is introduced
- A runtime implementation diverges from the canonical plan for a
  justified reason
- A decision will likely be revisited later and needs preserved context

## Read order for agents
1. Read titles first
2. Open the ADRs directly relevant to the surface you are changing
3. Treat documented ADR decisions as canonical unless they are
   explicitly superseded
