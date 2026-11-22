# 0012: The Backend Serves the Site

**Status:** Accepted
**Date:** 2026-11-22
**Deciders:** membrs team
**Tags:** deploy, seo, backend

## Context and Problem Statement

The site ran on Vercel, with two Vercel functions (`api/listing.ts`,
`api/sitemap.ts`) that rendered listing pages and the sitemap from the live API.
Production moved to one VPS, and the site and the API are now deployed
together.

## Decision Drivers

- One deploy and one rollback for the site and the API.
- Listing pages and the sitemap must still be crawlable with live data.
- The site name, origin, description and page list should have one source.

## Considered Options

1. **The Go backend serves `dist/`**: one image, one origin.
2. **A separate static container**: nginx or Caddy serving `dist/`, with the
   two functions ported to something else.

## Decision Outcome

Chosen option: **"The Go backend serves `dist/`"**, because the listing page
and sitemap need live listings, which the backend already holds in memory, and
one image keeps deploy and rollback atomic.

### Consequences

- ✅ **Good:** same-origin API (`VITE_API_BASE=/api`), no CORS for the site.
- ✅ **Good:** `npm run prerender` writes `dist/site.json`, so the server takes
  the site's name, origin, description and page list from here.
- ⚠️ **Bad:** the listing page markup is rendered in Go now, so changes to
  `renderShell` or listing metadata here must be mirrored in the backend's
  `internal/site`.
- ⚠️ **Bad:** a frontend release rebuilds and redeploys the backend image.

## More Information

- Backend: `internal/site`, `Dockerfile`, `decision.md` (2026-11-22).
- `.github/workflows/release.yml` starts the backend deploy.
