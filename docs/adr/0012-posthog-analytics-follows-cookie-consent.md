# 0012: PostHog analytics follow cookie consent

**Status:** Accepted
**Date:** 2026-11-14
**Deciders:** GiFTED!
**Tags:** analytics, privacy

## Context and Problem Statement

membrs needs to know which sections, listings and flows readers use, down to
which card they open and where they give up on a form. The cookie policy
promises that analytics cookies stay off until the reader turns them on, and
that analytics never identify anyone. Most readers never answer a cookie
banner, so analytics that wait for consent would miss most visits.

## Decision Drivers

- Keep the promises in the cookie and privacy policies.
- Count every visit, not only readers who accept.
- Funnels, heatmaps and replays need a stable anonymous ID.
- Ad blockers drop a fifth or more of requests to analytics domains.

## Considered Options

1. **No analytics until consent**: PostHog only starts after "Accept".
2. **Cookieless until consent**: PostHog counts every visit with a daily
   server-side hash and stores nothing on the device until the reader accepts.
3. **Always cookieless**: no banner choice matters, and no replays or funnels
   across days.

## Decision Outcome

Chosen option: **"Cookieless until consent"**, because it measures every
visit while writing nothing to the device until the reader says yes, which is
what the policies describe.

`src/lib/analytics.ts` starts PostHog with `cookieless_mode: 'on_reject'` and
`opt_out_capturing_by_default`, and keeps it in step with the cookie banner:
accepting analytics opts in (storage, replays, funnels across visits),
rejecting or an expired choice goes back to cookieless. Readers are never
identified, and replays mask every input.

Events go to `/ingest` on our own origin. Vite forwards it in development and
the rewrites in `vercel.json` forward it in production.

Custom events are typed in the `Events` interface. Named regions carry a
`data-ph-capture-attribute-area` attribute (`area()` and `context()` add it),
which autocapture and `track()` both read, so every click knows where on the
page it happened. The same attribute drives a `section_viewed` event when a
region scrolls into view.

### Consequences

- ✅ **Good:** every visit is counted, and readers who accept get full funnels,
  heatmaps and session replays.
- ✅ **Good:** nothing is stored on the device before consent.
- ✅ **Good:** without `VITE_POSTHOG_KEY` the SDK is left out of the build.
- ⚠️ **Bad:** cookieless visits cannot be joined to the same reader's later
  visits, or to their visits after they accept.
- ⚠️ **Bad:** the project must have cookieless server hash mode switched on
  in PostHog, or cookieless events are dropped.
- ⚠️ **Bad:** the PostHog region lives in two places, `VITE_POSTHOG_REGION`
  and the rewrites in `vercel.json`.

## More Information

- `src/lib/analytics.ts`, `src/lib/cookies.ts`, `vercel.json`, `vite.config.ts`
- [PostHog cookieless tracking](https://posthog.com/docs/libraries/js/persistence)
