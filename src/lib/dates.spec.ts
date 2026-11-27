import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calendarToday,
  deadlineUrgency,
  eventTag,
  urgencyLabel,
  weekendDays,
  whenLine,
} from './dates';
import { eventListing, opportunityListing } from './testing';
import type { OpportunityListing } from './types';

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
    expect(eventTag(event({ inDays: 2 }))).toBe('This Weekend');
    expect(eventTag(event({ inDays: 3 }))).toBe('This Weekend');
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

describe('urgencyLabel', () => {
  const NOW = Date.parse('2026-11-21T12:00:00Z');

  it('calls an event tonight urgent', () => {
    expect(urgencyLabel(event({ inDays: 0 }), NOW)).toEqual({
      text: 'Tonight',
      urgency: 'now',
    });
  });

  it('counts down the last week of a deadline', () => {
    const closing = (daysLeft: number) =>
      urgencyLabel(opportunityListing({ daysLeft }), NOW)?.text;
    expect(closing(0)).toBe('Closes Today');
    expect(closing(1)).toBe('Closes in 1 Day');
    expect(closing(5)).toBe('Closes in 5 Days');
    expect(closing(8)).toBeUndefined();
  });

  it('marks a listing added in the last day as new when nothing is sooner', () => {
    const fresh = '2026-11-21T02:00:00Z';
    expect(
      urgencyLabel(event({ inDays: 20, listedAt: fresh }), NOW)?.text,
    ).toBe('New Today');
    expect(urgencyLabel(event({ inDays: 0, listedAt: fresh }), NOW)?.text).toBe(
      'Tonight',
    );
    expect(
      urgencyLabel(
        event({ inDays: 20, listedAt: '2026-11-19T02:00:00Z' }),
        NOW,
      ),
    ).toBeNull();
  });
});
