# 0006: Google and Apple sign-in only

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** auth, privacy

## Context and Problem Statement

membrs needs accounts so readers can save listings and keep their digest
settings across devices. Storing passwords or running email codes means
holding credentials and the risk that comes with them.

## Considered Options

1. **Google and Apple only**, through their own sign-in flows.
2. **Email and password**, plus the two providers.
3. **Email one-time codes**, plus the two providers.

## Decision Outcome

Chosen option: **"Google and Apple only"**. The provider authenticates the
reader on their device and returns a signed ID token; the backend verifies it.
membrs stores no password and sends no codes. `src/lib/auth.ts` holds the
seam: `signIn()` is a stub that will call Google Identity Services and Sign in
with Apple JS. Readers who are not signed in see the popup when they land on
home.

### Consequences

- ✅ **Good:** no credentials to store, leak or reset.
- ✅ **Good:** one tap on phones, where both providers are built in.
- ⚠️ **Bad:** readers without a Google or Apple account cannot sign up.
- ⚠️ **Bad:** Apple's "Hide my email" relay addresses must be supported for the digest.
