# 0014: Email links carry the reader's interests

**Status:** Accepted
**Date:** 2026-11-27
**Deciders:** Owner
**Tags:** email, personalisation, privacy

## Context and Problem Statement

A reader who opens a link from their digest lands on a site that does not know them on that device, so the home page shows the same shelves as for a stranger.

## Decision Drivers

- The owner's call: interests travel in the URL, with no identity and no token.
- The home page should be personalised on the first paint.
- No second ranking path next to the For You one.

## Considered Options

1. **Interests in the URL**: `?for=music,art-design,jobs&in=Lagos` on the home, section and browser-view links.
2. **A signed reader token**: identifies the reader, so a forwarded email signs someone else in.

## Decision Outcome

Chosen option: **"Interests in the URL"**. `for` holds the event and opportunity interest slugs (`slugify` of the labels), `in` holds the city. Listing links carry nothing.

`src/lib/readerLink.ts` reads the link before the first render, puts the labels in `interestsStore`, the city through `adoptReaderCity`, sets `readerLinkStore`, and replaces the address without the two parameters. `src/lib/homeParams.ts` sends those picks as `interests=event:Music,opportunity:Jobs` with the prefetched first `listings/home` request, since `main.tsx` runs the link before the prefetch, and the server answers a `forYou` section ranked by the same function as `/me/for-you`. The For You screen asks for that section windowed when there is no session. Nothing ranks in the client.

The city rides in `in`, not `city`, because `city` is already a feed filter: on the home page it would swap the shelves for a filtered list. `for` is also the opportunity eligibility filter, so it is only consumed when at least one slug names an interest; `?for=NG` is left alone.

### Consequences

- ✅ **Good:** the site is personalised on arrival with nothing secret in the link.
- ⚠️ **Bad:** a forwarded email personalises the recipient's device with the sender's interests, replacing any picked there, until they sign out or pick again.

## More Information

- Backend: `internal/digests/reader_links.go`
- `src/lib/readerLink.ts`, `src/screens/HomeScreen.tsx`
