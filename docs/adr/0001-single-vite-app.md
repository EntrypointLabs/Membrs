# 0001: One Vite app, not a monorepo

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** structure

## Context and Problem Statement

membrs started as a single-file HTML prototype. Moving it to real code, the
reference was the Prydd repo (`xend-global`), a Turborepo monorepo whose web
apps (`apps/checkout`, `apps/merchant`) are Vite and React. membrs has one
frontend and no backend yet.

## Decision Drivers

- Easy to maintain for one person.
- Feels the same as working in `apps/checkout`: same tools, same layout.
- Room to grow without restructuring later.

## Considered Options

1. **Single Vite app** shaped like `apps/checkout`.
2. **Turborepo monorepo** with `apps/web` and shared `packages/*`.

## Decision Outcome

Chosen option: **"Single Vite app"**, because there is nothing to share yet.
The ESLint and TypeScript settings from `@prydd/eslint-config` and
`@prydd/typescript-config` are inlined into `eslint.config.mjs` and
`tsconfig.json`, so moving into a monorepo later is a copy, not a rewrite.

### Consequences

- ✅ **Good:** one `package.json`, one install, one build.
- ⚠️ **Bad:** a mobile app or backend later means adding workspaces then.
