import {
  DAY_MS,
  DEFAULT_EVENT_MS,
  clockMinutes,
  eventLocalDay,
  hasDeadline,
} from './dates';
import { slugify } from './text';
import type { EventListing, Listing, OpportunityListing } from './types';

const VENUE_TBA = 'Venue TBA';
const REMINDER_DAYS = 7;

interface CalendarDates {
  allDay: boolean;
  start: string;
  end: string;
}

function utcStamp(ms: number): string {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function dateStamp(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10).replace(/-/g, '');
}

export function calendarDates(event: EventListing): CalendarDates | null {
  if (!event.startsAt) return null;
  const start = Date.parse(event.startsAt);
  const end = event.endsAt ? Date.parse(event.endsAt) : null;
  if (clockMinutes(event.time) === null) {
    const first = eventLocalDay(event, start);
    const last = end ? eventLocalDay(event, Math.max(start, end - 1)) : first;
    return {
      allDay: true,
      start: dateStamp(first),
      end: dateStamp(Math.max(first, last) + 1),
    };
  }
  return {
    allDay: false,
    start: utcStamp(start),
    end: utcStamp(end && end > start ? end : start + DEFAULT_EVENT_MS),
  };
}

export function calendarLocation(event: EventListing): string {
  if (event.mode === 'Remote') return 'Online';
  return [event.venue, event.area]
    .map((part) => part.trim())
    .filter((part) => part && part !== VENUE_TBA)
    .join(', ');
}

interface CalendarEntry {
  title: string;
  details: string;
  location: string;
  dates: CalendarDates | null;
}

function details(listing: Listing): string {
  return [listing.blurb, listing.url].filter(Boolean).join('\n\n');
}

function localStamp(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function opensFor(opportunity: OpportunityListing): boolean {
  return hasDeadline(opportunity) && opportunity.daysLeft >= 0;
}

function reminderDates(
  opportunity: OpportunityListing,
  now: Date,
): CalendarDates {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  day.setDate(
    day.getDate() +
      (opensFor(opportunity) ? opportunity.daysLeft : REMINDER_DAYS),
  );
  const after = new Date(day);
  after.setDate(after.getDate() + 1);
  return { allDay: true, start: localStamp(day), end: localStamp(after) };
}

function calendarEntry(listing: Listing, now: Date): CalendarEntry {
  if (listing.kind === 'event')
    return {
      title: listing.title,
      details: details(listing),
      location: calendarLocation(listing),
      dates: calendarDates(listing),
    };
  return {
    title: `${opensFor(listing) ? 'Deadline' : 'Apply'}: ${listing.title}`,
    details: details(listing),
    location: '',
    dates: reminderDates(listing, now),
  };
}

export function googleCalendarHref(listing: Listing, now = new Date()): string {
  const entry = calendarEntry(listing, now);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: entry.title,
    details: entry.details,
  });
  if (entry.location) params.set('location', entry.location);
  if (entry.dates)
    params.set('dates', `${entry.dates.start}/${entry.dates.end}`);
  return `https://calendar.google.com/calendar/render?${params}`;
}

function icsText(value: string): string {
  return value.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');
}

function folded(line: string): string {
  const chunks = line.match(/.{1,74}/gu) ?? [''];
  return chunks.join('\r\n ');
}

export function icsFile(listing: Listing, now = Date.now()): string {
  const entry = calendarEntry(listing, new Date(now));
  const dates = entry.dates;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//membrs//membrs//EN',
    'BEGIN:VEVENT',
    `UID:${listing.id}@membrs`,
    `DTSTAMP:${utcStamp(now)}`,
    ...(dates
      ? dates.allDay
        ? [`DTSTART;VALUE=DATE:${dates.start}`, `DTEND;VALUE=DATE:${dates.end}`]
        : [`DTSTART:${dates.start}`, `DTEND:${dates.end}`]
      : []),
    `SUMMARY:${icsText(entry.title)}`,
    `DESCRIPTION:${icsText(entry.details)}`,
    ...(entry.location ? [`LOCATION:${icsText(entry.location)}`] : []),
    ...(listing.url ? [`URL:${listing.url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(folded).join('\r\n')}\r\n`;
}

export function downloadIcs(listing: Listing): void {
  const url = URL.createObjectURL(
    new Blob([icsFile(listing)], { type: 'text/calendar;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(listing.title) || 'membrs'}.ics`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
