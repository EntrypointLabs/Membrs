import { bySoonest } from './dates';
import type { EventListing, Listing } from './types';

function runKey(event: EventListing): string {
  return `${event.title.trim().toLowerCase()}|${event.city.trim().toLowerCase()}`;
}

export function collapsedRuns(listings: Listing[]): Listing[] {
  const nights = new Map<string, EventListing[]>();
  for (const listing of listings) {
    if (listing.kind !== 'event') continue;
    const key = runKey(listing);
    nights.set(key, [...(nights.get(key) ?? []), listing]);
  }
  const shown = new Set<string>();
  const collapsed: Listing[] = [];
  for (const listing of listings) {
    if (listing.kind !== 'event') {
      collapsed.push(listing);
      continue;
    }
    const key = runKey(listing);
    if (shown.has(key)) continue;
    shown.add(key);
    const run = [...(nights.get(key) ?? [listing])].sort(bySoonest);
    const first = run[0] as EventListing;
    const last = run[run.length - 1] as EventListing;
    collapsed.push(
      run.length > 1
        ? { ...first, runLength: run.length, runUntil: last.date }
        : first,
    );
  }
  return collapsed;
}
