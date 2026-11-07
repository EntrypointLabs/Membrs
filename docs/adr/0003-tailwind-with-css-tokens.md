# 0003: Tailwind with theme tokens as CSS variables

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** styling

## Context and Problem Statement

The prototype's styling was about 5,000 lines of hand-written CSS with
override layers. membrs has a dark default and a light mode, and several
surfaces that flip against the page (the footer, Most Popular).

## Considered Options

1. **Tailwind 4 with tokens as CSS variables**, like `apps/checkout`.
2. **Port the prototype CSS as-is.**

## Decision Outcome

Chosen option: **"Tailwind 4 with tokens as CSS variables"**. Every colour is a
variable set per theme on `<html data-theme>` and exposed through
`@theme inline` (`bg-panel`, `text-fg-3`, `bg-inv`). `dark:` follows the
attribute, not the OS. membrs blue (`brand`) never flips. Category colours are
pairs in `src/lib/palette.ts` applied with `.cat-color` and `.cat-bg`.

### Consequences

- ✅ **Good:** one class set works in both themes.
- ✅ **Good:** no `!important` anywhere.
- ⚠️ **Bad:** a few long class strings; extract a component when one repeats.
