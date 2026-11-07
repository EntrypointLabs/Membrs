import type { DayLabel, EventListing, Listing } from './types';

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The time tag an event wears on cards: Tonight, Tomorrow, or This weekend
 * when it lands on the coming Saturday or Sunday. Anything further out has no
 * tag, so the tags stay rare enough to mean something.
 */
export function eventTag(event: EventListing): string {
  if (event.inDays === 0) return 'Tonight';
  if (event.inDays === 1) return 'Tomorrow';
  const weekend = event.date.weekday === 'Sat' || event.date.weekday === 'Sun';
  if (event.inDays <= 3 && weekend) return 'This weekend';
  return '';
}

/** "Sat 7 Nov" */
export function shortDay(label: DayLabel): string {
  return `${label.weekday} ${label.day} ${label.month}`;
}

/**
 * How urgent a deadline is. Three days or less is red, a week or less is
 * amber, anything further is the calm accent.
 */
export type Urgency = 'now' | 'soon' | 'later';

export function deadlineUrgency(daysLeft: number): Urgency {
  if (daysLeft <= 3) return 'now';
  if (daysLeft <= 7) return 'soon';
  return 'later';
}

/** Soonest first: events by days away, opportunities by days left. */
export function soonness(listing: Listing): number {
  return listing.kind === 'event' ? listing.inDays : listing.daysLeft;
}

export function bySoonest(a: Listing, b: Listing): number {
  return soonness(a) - soonness(b);
}

/** One line for when a listing happens or closes. */
export function whenLine(listing: Listing): string {
  return listing.kind === 'event'
    ? `${shortDay(listing.date)}, ${listing.time}`
    : `Closes ${shortDay(listing.deadline)}`;
}
