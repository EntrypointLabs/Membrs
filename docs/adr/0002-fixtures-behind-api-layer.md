# 0002: Typed fixtures behind an API layer

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** data

## Context and Problem Statement

The lite rollout has no backend. Listings are curated by hand. The code still
has to be ready for an API without screens changing when it arrives.

## Considered Options

1. **Fixtures behind `src/lib/api.ts`**: JSON in `src/fixtures`, typed by `src/lib/types.ts`, read only through `api.ts`.
2. **Constants imported directly by screens.**

## Decision Outcome

Chosen option: **"Fixtures behind `src/lib/api.ts`"**. `VITE_API_BASE` switches
writes (`subscribe`, `submitContribution`) and reads (`fetchListings`) to the
API. The fixtures are generated from the prototype and checked by
`api.spec.ts`, so a broken fixture fails the tests rather than a page.

### Consequences

- ✅ **Good:** the types are the API contract.
- ✅ **Good:** relative labels (Tonight, 4d left) are pinned to `REFERENCE_DATE`, so screenshots and tests are stable.
- ⚠️ **Bad:** until the API exists, dates do not move. Replace `REFERENCE_DATE` with the real date when data goes live.
