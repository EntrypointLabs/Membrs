import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eventListing, opportunityListing } from './testing';
import type { Listing } from './types';
import {
  EVENT_VIEWS,
  findView,
  groupByView,
  OPPORTUNITY_VIEWS,
  type View,
} from './views';

const SATURDAY_EVENING = new Date('2026-11-14T18:28:00Z');

const ids = (views: View<Listing>[], items: Listing[], id: string) =>
  items.filter(findView(views, id)!.test).map((l) => l.id);

beforeEach(() => vi.useFakeTimers({ now: SATURDAY_EVENING }));
afterEach(() => vi.useRealTimers());

describe('event views', () => {
  const events = [
    eventListing({
      id: 'started',
      inDays: 0,
      time: '9:00 AM',
      startsAt: '2026-11-14T08:00:00Z',
      endsAt: '2026-11-14T22:00:00Z',
    }),
    eventListing({
      id: 'tonight',
      inDays: 0,
      time: '9:00 PM',
      startsAt: '2026-11-14T20:00:00Z',
    }),
    eventListing({ id: 'sunday', inDays: 1 }),
    eventListing({ id: 'monday', inDays: 2 }),
    eventListing({ id: 'tuesday', inDays: 3 }),
    eventListing({ id: 'nov30', inDays: 16 }),
    eventListing({ id: 'dec5', inDays: 21 }),
  ];

  it('keeps Tonight to events that have not started yet', () => {
    expect(ids(EVENT_VIEWS, events, 'tonight')).toEqual(['tonight']);
    expect(ids(EVENT_VIEWS, events, 'now')).toEqual(['started']);
  });

  it('keeps This Weekend to the coming Saturday and Sunday', () => {
    expect(ids(EVENT_VIEWS, events, 'weekend')).toEqual([
      'started',
      'tonight',
      'sunday',
    ]);
  });

  it('keeps Later This Month inside the calendar month', () => {
    expect(ids(EVENT_VIEWS, events, 'month')).toEqual(['nov30']);
    expect(ids(EVENT_VIEWS, events, 'later')).toEqual(['dec5']);
  });

  it('puts every event in exactly one group', () => {
    const groups = groupByView(events, EVENT_VIEWS);
    expect(groups.flatMap((g) => g.items)).toHaveLength(events.length);
    expect(groups.map((g) => g.view.id)).toEqual([
      'now',
      'tonight',
      'tomorrow',
      'week',
      'month',
      'later',
    ]);
  });
});

describe('opportunity views', () => {
  const opportunities = [
    opportunityListing({ id: 'monday', daysLeft: 2 }),
    opportunityListing({ id: 'thursday', daysLeft: 5 }),
    opportunityListing({ id: 'nextMonday', daysLeft: 9 }),
    opportunityListing({ id: 'nov30', daysLeft: 16 }),
    opportunityListing({ id: 'dec1', daysLeft: 17 }),
  ];

  it('follows calendar weeks and the calendar month', () => {
    expect(ids(OPPORTUNITY_VIEWS, opportunities, 'next')).toEqual([
      'monday',
      'thursday',
    ]);
    expect(ids(OPPORTUNITY_VIEWS, opportunities, 'month')).toEqual([
      'nextMonday',
      'nov30',
    ]);
    expect(ids(OPPORTUNITY_VIEWS, opportunities, 'later')).toEqual(['dec1']);
  });

  it('puts every opportunity in exactly one group', () => {
    const groups = groupByView(opportunities, OPPORTUNITY_VIEWS);
    expect(groups.flatMap((g) => g.items)).toHaveLength(opportunities.length);
  });
});
