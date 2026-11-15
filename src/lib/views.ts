import { openStateNow } from './hours';
import { calendarToday, hasStarted, weekendDays } from './dates';
import type {
  EventListing,
  Listing,
  OpportunityListing,
  Place,
  Promo,
} from './types';

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

const isEvent = (l: Listing): l is EventListing => l.kind === 'event';
const isOpportunity = (l: Listing): l is OpportunityListing =>
  l.kind === 'opportunity';
const WEEK_DAYS = 7;

export const EVENT_VIEWS: View<Listing>[] = [
  {
    id: 'now',
    label: 'Happening Now',
    test: (l) => isEvent(l) && l.inDays === 0 && hasStarted(l),
  },
  {
    id: 'tonight',
    label: 'Tonight',
    test: (l) => isEvent(l) && l.inDays === 0 && !hasStarted(l),
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow',
    test: (l) => isEvent(l) && l.inDays === 1,
  },
  {
    id: 'weekend',
    label: 'This Weekend',
    test: (l) => {
      const [saturday, sunday] = weekendDays();
      return isEvent(l) && l.inDays >= saturday && l.inDays <= sunday;
    },
  },
  {
    id: 'week',
    label: 'Next 7 Days',
    test: (l) => isEvent(l) && l.inDays <= WEEK_DAYS,
  },
  {
    id: 'month',
    label: 'Later This Month',
    test: (l) =>
      isEvent(l) &&
      l.inDays > WEEK_DAYS &&
      l.inDays <= calendarToday().daysLeftInMonth,
  },
  {
    id: 'later',
    label: 'Further Ahead',
    test: (l) =>
      isEvent(l) &&
      l.inDays > Math.max(WEEK_DAYS, calendarToday().daysLeftInMonth),
  },
];

function weekEnds(): { thisWeek: number; nextWeek: number } {
  const thisWeek = 6 - calendarToday().weekday;
  return { thisWeek, nextWeek: thisWeek + WEEK_DAYS };
}

export const OPPORTUNITY_VIEWS: View<Listing>[] = [
  {
    id: 'three',
    label: 'Closing in 3 Days',
    test: (l) => isOpportunity(l) && l.daysLeft <= 3,
  },
  {
    id: 'week',
    label: 'Closing This Week',
    test: (l) => isOpportunity(l) && l.daysLeft <= weekEnds().thisWeek,
  },
  {
    id: 'next',
    label: 'Closing Next Week',
    test: (l) => {
      const { thisWeek, nextWeek } = weekEnds();
      return (
        isOpportunity(l) && l.daysLeft > thisWeek && l.daysLeft <= nextWeek
      );
    },
  },
  {
    id: 'month',
    label: 'Later This Month',
    test: (l) =>
      isOpportunity(l) &&
      l.daysLeft > weekEnds().nextWeek &&
      l.daysLeft <= calendarToday().daysLeftInMonth,
  },
  {
    id: 'later',
    label: 'Further Ahead',
    test: (l) =>
      isOpportunity(l) &&
      l.daysLeft >
        Math.max(weekEnds().nextWeek, calendarToday().daysLeftInMonth),
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

export function groupByView<T>(
  items: T[],
  views: View<T>[],
): { view: View<T>; items: T[] }[] {
  const groups = views.map((view) => ({ view, items: [] as T[] }));
  for (const item of items)
    groups.find((g) => g.view.test(item))?.items.push(item);
  return groups.filter((g) => g.items.length > 0);
}
