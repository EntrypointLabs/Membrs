# 0005: Time views and categories share one picker

**Status:** Accepted
**Date:** 2026-11-07
**Deciders:** GiFTED!
**Tags:** ux, feeds

## Context and Problem Statement

Each section is grouped by time on phones (Tonight, Closing Next Week, Open
Now) with "N more ›" links. In the prototype those links opened pages with a
different header from the category pages, so the same kind of page looked two
ways depending on how you got there.

## Decision Outcome

Views are first-class filters. `src/lib/views.ts` defines them per section,
and `FeedPicker` lists them under "When" in the same sheet as the categories.
Both write to the URL (`?view=` or `?type=`), so every slice of a section
renders through `FeedBody` with the same header: "Opportunities Closing Next
Week ›" looks like "Opportunities Grants ›".

### Consequences

- ✅ **Good:** one layout for every filtered page.
- ✅ **Good:** "see more" links are just URLs.
- ⚠️ **Bad:** a view and a category cannot be combined from the picker; extra filters (city, budget) still can.
