# 0011: Sections Open on a Rail and Time Groups

**Status:** Accepted
**Date:** 2026-11-10
**Deciders:** GiFTED!
**Tags:** feeds, layout, filters

## Context and Problem Statement

Events, Opportunities, Places and Promos used to open on web as one long paged list, while phones opened on time groups. The prototype moved both to the same shape, and the filters had grown to two lines that took most of the page width.

## Decision Drivers

- Web and phones should open a section the same way.
- Filters take no more than half the page, on one line.
- The reader's city is already known, so the City filter starts on it.
- Every group shows three to five listings; a group of one or two reads as noise.

## Considered Options

1. **Flat list on web, groups on phones**: the old behaviour.
2. **Rail of cards, then time groups, everywhere**: the prototype's behaviour.

## Decision Outcome

Chosen option: **"Rail of cards, then time groups, everywhere"**, because one shape is easier to learn and to maintain. With nothing picked beyond the reader's city, a section opens on a rail (Happening Soon, Closing Soon, Trending Places, Ending Soon) and then the time views, three to five rows each, with "N more" opening that view. Picking a type, a view or a filter switches to the flat paged list. Type and City stay on the filter line; the time view, Budget and Entry move under Filters.

### Consequences

- `FeedBody` owns grouping for every section; screens only pass their views, rail and card.
- Groups under three listings are hidden unless no group reaches three.
- The digest pages are gone (see the README); the Sunday email itself stays as the footer sign-up.
