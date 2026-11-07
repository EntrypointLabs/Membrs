# 0004: A dependency-free history router

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** routing

## Context and Problem Statement

membrs has about twenty pages and no nested layouts. The merchant portal in
`xend-global` solved the same problem with a small router on
`useSyncExternalStore`.

## Decision Outcome

Chosen: the same pattern, in `src/lib/router.ts`. `parseRoute()` turns a URL
into a typed `Route`, `paths` builds every URL, and filters that should
survive a refresh or a shared link (`view`, `type`, `page`) live in the query
string. The prototype's `#hash` routes became real paths; `vercel.json`
rewrites every path to `index.html`.

### Consequences

- ✅ **Good:** no router dependency, fully typed routes, tested in `router.spec.ts`.
- ⚠️ **Bad:** no route-level code splitting yet; add `lazy()` per screen if the bundle grows.
