# 0010: shadcn/ui for forms

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** ui, forms

## Context and Problem Statement

The Contribute forms were hand-rolled inputs and native selects. Selects
looked different on every platform, and labels, errors and choice cards were
each styled their own way.

## Decision Outcome

Every Contribute form uses shadcn/ui: Field for layout, labels and errors,
Input, Textarea, Select, RadioGroup choice cards, Checkbox and Button. The
components live in `src/components/ui/` as source we own, built on Radix.
shadcn's colour names are mapped onto the membrs tokens in `index.css`, so the
components render in our palette in both themes without edits.

### Consequences

- ✅ **Good:** accessible selects, radios and checkboxes that look the same everywhere.
- ✅ **Good:** one pattern for label, control and error across all five forms.
- ⚠️ **Bad:** Radix adds about 50 KB gzipped, paid only on the Contribute page because it is its own chunk.
