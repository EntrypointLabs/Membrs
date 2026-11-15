import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bySoonest,
  calendarToday,
  deadlineUrgency,
  eventTag,
  stillOpen,
  weekendDays,
  whenLine,
} from './dates';
import { eventListing, opportunityListing } from './testing';
import type { EventListing, OpportunityListing } from './types';

const event = eventListing;

const SATURDAY_EVENING = new Date('2026-11-14T18:28:00Z');
const THURSDAY = new Date('2026-11-12T10:00:00Z');

afterEach(() => vi.useRealTimers());

describe('eventTag', () => {
  it('calls today Tonight and the next day Tomorrow', () => {
    expect(eventTag(event({ inDays: 0 }))).toBe('Tonight');
    expect(eventTag(event({ inDays: 1 }))).toBe('Tomorrow');
  });

  it('only calls the coming Saturday and Sunday This weekend', () => {
    vi.useFakeTimers({ now: THURSDAY });
    expect(eventTag(event({ inDays: 2 }))).toBe('This weekend');
    expect(eventTag(event({ inDays: 3 }))).toBe('This weekend');
    expect(eventTag(event({ inDays: 4 }))).toBe('');
    vi.setSystemTime(SATURDAY_EVENING);
    expect(eventTag(event({ inDays: 2 }))).toBe('');
  });
});

describe('calendarToday', () => {
  it('reads the weekday and the days left in the month in Lagos', () => {
    expect(calendarToday(SATURDAY_EVENING.getTime())).toEqual({
      weekday: 5,
      daysLeftInMonth: 16,
    });
    expect(calendarToday(Date.parse('2026-11-30T23:30:00Z'))).toEqual({
      weekday: 1,
      daysLeftInMonth: 30,
    });
  });

  it('puts the weekend on the coming Saturday and Sunday only', () => {
    expect(weekendDays({ weekday: 0, daysLeftInMonth: 0 })).toEqual([5, 6]);
    expect(weekendDays({ weekday: 5, daysLeftInMonth: 0 })).toEqual([0, 1]);
    expect(weekendDays({ weekday: 6, daysLeftInMonth: 0 })).toEqual([0, 0]);
  });
});

describe('stillOpen', () => {
  const lagos = (over: Parameters<typeof event>[0]) =>
    stillOpen([event(over)], SATURDAY_EVENING)[0] as EventListing | undefined;

  it('counts days in the event timezone, not the reader one', () => {
    const late = lagos({
      date: { weekday: 'Sun', day: 15, month: 'Nov' },
      time: '12:30 AM',
      startsAt: '2026-11-14T23:30:00Z',
    });
    expect(late?.inDays).toBe(1);
    const london = lagos({
      date: { weekday: 'Sat', day: 14, month: 'Nov' },
      time: '11:30 PM',
      startsAt: '2026-11-14T23:30:00Z',
    });
    expect(london?.inDays).toBe(0);
  });

  it('drops events that are already over today', () => {
    expect(
      lagos({
        date: { weekday: 'Sat', day: 14, month: 'Nov' },
        time: '7:00 AM',
        startsAt: '2026-11-14T06:00:00Z',
      }),
    ).toBeUndefined();
    expect(
      lagos({
        date: { weekday: 'Sat', day: 14, month: 'Nov' },
        time: '9:00 AM',
        startsAt: '2026-11-14T08:00:00Z',
        endsAt: '2026-11-14T12:00:00Z',
      }),
    ).toBeUndefined();
    expect(
      lagos({
        date: { weekday: 'Sat', day: 14, month: 'Nov' },
        time: '9:00 AM',
        startsAt: '2026-11-14T08:00:00Z',
        endsAt: '2026-11-14T22:00:00Z',
      })?.inDays,
    ).toBe(0);
  });

  it('counts deadlines in calendar days', () => {
    const [open] = stillOpen(
      [
        opportunityListing({
          deadline: {
            weekday: 'Tue',
            day: 1,
            month: 'Dec',
            label: 'Tue 1 Dec 2026',
          },
        }),
      ],
      SATURDAY_EVENING,
    );
    expect(open?.kind === 'opportunity' && open.daysLeft).toBe(17);
  });
});

describe('bySoonest', () => {
  it('orders events by start and opportunities by deadline, rolling last', () => {
    const sorted = [
      event({ id: 'late', inDays: 0, startsAt: '2026-11-14T21:00:00Z' }),
      event({ id: 'next', inDays: 3 }),
      event({ id: 'early', inDays: 0, startsAt: '2026-11-14T19:00:00Z' }),
    ].sort(bySoonest);
    expect(sorted.map((l) => l.id)).toEqual(['early', 'late', 'next']);
    const rolling = opportunityListing({
      id: 'rolling',
      daysLeft: 365,
      deadline: { weekday: '', day: 0, month: '', label: 'Rolling' },
    });
    const far = opportunityListing({ id: 'far', daysLeft: 500 });
    const near = opportunityListing({ id: 'near', daysLeft: 4 });
    expect([rolling, far, near].sort(bySoonest).map((l) => l.id)).toEqual([
      'near',
      'far',
      'rolling',
    ]);
  });
});

describe('deadlineUrgency', () => {
  it('marks three days or less as now, a week as soon', () => {
    expect(deadlineUrgency(3)).toBe('now');
    expect(deadlineUrgency(4)).toBe('soon');
    expect(deadlineUrgency(7)).toBe('soon');
    expect(deadlineUrgency(8)).toBe('later');
  });
});

describe('whenLine', () => {
  it('prints the day and time for an event', () => {
    expect(whenLine(event({}))).toBe('Sat 7 Nov, 6:00 PM');
  });

  it('prints the closing day for an opportunity', () => {
    const opp = {
      kind: 'opportunity',
      deadline: { weekday: 'Mon', day: 16, month: 'Nov', label: '' },
    } as OpportunityListing;
    expect(whenLine(opp)).toBe('Closes Mon 16 Nov');
  });
});
