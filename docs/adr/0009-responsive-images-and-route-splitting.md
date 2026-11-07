# 0009: Responsive images and route splitting

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** performance

## Context and Problem Statement

membrs is mostly photos and will carry many more of them. One full-size WebP
per photo, and every screen in one bundle, made phones pay for desktop
images and pages they never open.

## Decision Outcome

`scripts/optimize-images.mjs` turns each source in `assets/photos/` into AVIF
and WebP at up to five widths, never upscaled, and writes
`src/generated/photos.json` with sizes and a tiny blurred preview. `Photo`
renders a `<picture>` with `sizes` presets, fixed dimensions, lazy loading
below the fold and high priority for the hero. Every screen except Home is
lazy, preloaded on link hover or touch. React has its own long-cached chunk.

### Consequences

- ✅ **Good:** phones download a 320 to 640px AVIF instead of a full-size image.
- ✅ **Good:** no layout shift, and a preview while photos load.
- ⚠️ **Bad:** the script runs before every dev and build; it skips files that already exist.
- ⚠️ **Bad:** a replaced photo needs a new id or a cache purge, since files are cached for a day.
