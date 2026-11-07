# 0007: Ads are paid upfront with Bachs

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** ads, payments

## Context and Problem Statement

Ads were requested and quoted by email. That is slow for buyers and leaves
membrs chasing payment after the ad is agreed. Every ad still has to be
checked, and anything not safe for work must never run.

## Considered Options

1. **Pay upfront with Bachs, review after, refund if rejected.**
2. **Review first, then send a payment link.**
3. **Keep quotes by email.**

## Decision Outcome

Chosen option: **"Pay upfront with Bachs"**. An ad is not a banner: it runs
as the first listing in the feed the buyer picks (Home, Events,
Opportunities, Places or Promos), in the same card as every other listing.
Each feed has a fixed day rate
(`src/lib/ads.ts`) with 10% off two weeks and 20% off thirty days. The form
states the safe-for-work rule and the buyer confirms it before paying. Our
server creates the Bachs session and fulfils from the signed webhook; an AI
reviewer checks each paid ad and rejected ads are refunded in full. Details in
`docs/payments.md`.

### Consequences

- ✅ **Good:** one sitting from form to paid, no back and forth.
- ✅ **Good:** only paying buyers reach review, which cuts spam.
- ⚠️ **Bad:** refunds for rejected ads cost fees; the policy box exists to keep them rare.
- ⚠️ **Bad:** the day-rate table lives in two places, the frontend and the server, and must match.
