import { describe, expect, it } from 'vitest';
import { deadlineUrgency, eventTag, whenLine } from './dates';
import type { EventListing, OpportunityListing } from './types';

const event = (over: Partial<EventListing>): EventListing => ({
  id: 'e',
  kind: 'event',
  title: 'Show',
  category: 'Music',
  city: 'Lagos',
  organiser: 'Host',
  source: 'site',
  url: 'https://example.com',
  trending: false,
  blurb: '',
  listedRank: 1,
  photo: 'p1',
  area: 'Onikan',
  venue: 'Hall',
  date: { weekday: 'Sat', day: 7, month: 'Nov' },
  time: '6:00 PM',
  price: '₦15,000',
  free: false,
  mode: 'In person',
  inDays: 2,
  host: 'Host',
  startsAt: null,
  endsAt: null,
  ...over,
});

describe('eventTag', () => {
  it('calls today Tonight and the next day Tomorrow', () => {
    expect(eventTag(event({ inDays: 0 }))).toBe('Tonight');
    expect(eventTag(event({ inDays: 1 }))).toBe('Tomorrow');
  });

  it('only calls a near Saturday or Sunday This weekend', () => {
    expect(eventTag(event({ inDays: 2 }))).toBe('This weekend');
    expect(
      eventTag(
        event({ inDays: 2, date: { weekday: 'Mon', day: 9, month: 'Nov' } }),
      ),
    ).toBe('');
    expect(eventTag(event({ inDays: 9 }))).toBe('');
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
