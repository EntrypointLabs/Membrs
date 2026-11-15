import { describe, expect, it } from 'vitest';
import { calendarLocation, googleCalendarHref, icsFile } from './calendar';
import { eventListing } from './testing';

const dates = (href: string) => new URL(href).searchParams.get('dates');

describe('calendar links', () => {
  it('gives an event with no end time a two hour slot', () => {
    const event = eventListing({
      time: '6:00 PM',
      startsAt: '2026-11-23T17:00:00Z',
    });
    expect(dates(googleCalendarHref(event))).toBe(
      '20261123T170000Z/20261123T190000Z',
    );
  });

  it('makes a date-only event an all-day event on its own day', () => {
    const event = eventListing({
      date: { weekday: 'Wed', day: 23, month: 'Dec' },
      time: 'Times TBA',
      startsAt: '2026-12-22T23:00:00Z',
      endsAt: '2026-12-23T23:00:00Z',
    });
    expect(dates(googleCalendarHref(event))).toBe('20261223/20261224');
    expect(icsFile(event, 0)).toContain('DTSTART;VALUE=DATE:20261223');
  });

  it('never sends Venue TBA as a location', () => {
    const online = eventListing({
      mode: 'Remote',
      venue: 'Venue TBA',
      area: '',
    });
    expect(calendarLocation(online)).toBe('Online');
    const tba = eventListing({ venue: 'Venue TBA', area: 'Lekki' });
    expect(calendarLocation(tba)).toBe('Lekki');
  });

  it('writes an ics file Apple and Outlook can open', () => {
    const ics = icsFile(
      eventListing({
        title: 'Jazz, live; late',
        startsAt: '2026-11-23T17:00:00Z',
        endsAt: '2026-11-23T20:00:00Z',
      }),
      0,
    );
    expect(ics).toContain('BEGIN:VEVENT\r\n');
    expect(ics).toContain('DTSTART:20261123T170000Z');
    expect(ics).toContain('DTEND:20261123T200000Z');
    expect(ics).toContain('SUMMARY:Jazz\\, live\\; late');
  });
});
