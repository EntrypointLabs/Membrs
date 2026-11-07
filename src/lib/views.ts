import { openStateNow } from './hours';
import type { Listing, Place, Promo } from './types';

/**
 * Time views: the slices each section is grouped into (Tonight, Closing Next
 * Week, Open Now…). They are first-class filters, listed in the same picker
 * as categories, so "see more" from a group and choosing a category land on
 * the same page with the same header.
 */
export interface View<T> {
  id: string;
  label: string;
  test: (item: T) => boolean;
}

export const EVENT_VIEWS: View<Listing>[] = [
  {
    id: 'tonight',
    label: 'Tonight',
    test: (l) => l.kind === 'event' && l.inDays === 0,
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow',
    test: (l) => l.kind === 'event' && l.inDays === 1,
  },
  {
    id: 'weekend',
    label: 'This Weekend',
    test: (l) => l.kind === 'event' && l.inDays >= 2 && l.inDays <= 3,
  },
  {
    id: 'week',
    label: 'Next 7 Days',
    test: (l) => l.kind === 'event' && l.inDays >= 4 && l.inDays <= 10,
  },
  {
    id: 'month',
    label: 'Later This Month',
    test: (l) => l.kind === 'event' && l.inDays > 10 && l.inDays <= 25,
  },
  {
    id: 'later',
    label: 'Further Ahead',
    test: (l) => l.kind === 'event' && l.inDays > 25,
  },
];

export const OPPORTUNITY_VIEWS: View<Listing>[] = [
  {
    id: 'three',
    label: 'Closing in 3 Days',
    test: (l) => l.kind === 'opportunity' && l.daysLeft <= 3,
  },
  {
    id: 'week',
    label: 'Closing This Week',
    test: (l) => l.kind === 'opportunity' && l.daysLeft >= 4 && l.daysLeft <= 7,
  },
  {
    id: 'next',
    label: 'Closing Next Week',
    test: (l) =>
      l.kind === 'opportunity' && l.daysLeft >= 8 && l.daysLeft <= 14,
  },
  {
    id: 'month',
    label: 'Later This Month',
    test: (l) =>
      l.kind === 'opportunity' && l.daysLeft >= 15 && l.daysLeft <= 31,
  },
  {
    id: 'later',
    label: 'Further Ahead',
    test: (l) => l.kind === 'opportunity' && l.daysLeft > 31,
  },
];

export const PLACE_VIEWS: View<Place>[] = [
  { id: 'now', label: 'Open Now', test: (p) => openStateNow(p).open },
  {
    id: 'later',
    label: 'Opens Later Today',
    test: (p) =>
      !openStateNow(p).open && /^Opens \d/.test(openStateNow(p).detail),
  },
  {
    id: 'closed',
    label: 'Closed Today',
    test: (p) =>
      !openStateNow(p).open && !/^Opens \d/.test(openStateNow(p).detail),
  },
];

export const PROMO_VIEWS: View<Promo>[] = [
  {
    id: 'three',
    label: 'Ending in 3 Days',
    test: (p) => !p.startsInDays && p.endsInDays <= 3,
  },
  {
    id: 'week',
    label: 'Ending This Week',
    test: (p) => !p.startsInDays && p.endsInDays >= 4 && p.endsInDays <= 7,
  },
  {
    id: 'month',
    label: 'Later This Month',
    test: (p) => !p.startsInDays && p.endsInDays > 7,
  },
  { id: 'soon', label: 'Coming Up', test: (p) => p.startsInDays > 0 },
];

export function findView<T>(
  views: View<T>[],
  id: string | null,
): View<T> | undefined {
  return id ? views.find((v) => v.id === id) : undefined;
}
