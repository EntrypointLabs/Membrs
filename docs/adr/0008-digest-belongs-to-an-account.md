# 0008: The digest belongs to an account

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** auth, digest

## Context and Problem Statement

There were three ways to join the Sunday Digest: the footer email box, the
mail button's email modal and the last onboarding step. With Google and Apple
sign-in (0006) they collected the same thing a different way.

## Decision Outcome

Every entry point goes through `openDigest()` in `src/lib/ui.ts`: signed
out, it opens the sign-up card; signed in, it opens city and interests. The
footer shows the provider buttons, then a status line with Edit. The sign-up
card opens every time a signed-out reader lands on home. There is no email
form left.

### Consequences

- ✅ **Good:** one flow, one set of copy, one place to change it.
- ✅ **Good:** the digest address is the verified provider email.
- ⚠️ **Bad:** readers who will not use Google or Apple cannot get the digest.
