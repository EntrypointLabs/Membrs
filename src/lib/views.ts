import { openStateNow } from './hours';
import type { Place, Promo } from './types';

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

export function groupByView<T>(
  items: T[],
  views: View<T>[],
): { view: View<T>; items: T[] }[] {
  const groups = views.map((view) => ({ view, items: [] as T[] }));
  for (const item of items)
    groups.find((g) => g.view.test(item))?.items.push(item);
  return groups.filter((g) => g.items.length > 0);
}
