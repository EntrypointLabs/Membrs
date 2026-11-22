import { DAY_MS, DEFAULT_EVENT_MS, clockMinutes, eventLocalDay } from './dates';
import { slugify } from './text';
import type { EventListing, OpportunityListing } from './types';

const VENUE_TBA = 'Venue TBA';

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

function details(event: EventListing): string {
  return [event.blurb, event.url].filter(Boolean).join('\n\n');
}

export function googleCalendarHref(event: EventListing): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    details: details(event),
  });
  const location = calendarLocation(event);
  if (location) params.set('location', location);
  const dates = calendarDates(event);
  if (dates) params.set('dates', `${dates.start}/${dates.end}`);
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** An all-day reminder on the closing day, counted from today in local time. */
export function deadlineCalendarHref(
  opportunity: OpportunityListing,
  now = new Date(),
): string {
  const close = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  close.setDate(close.getDate() + opportunity.daysLeft);
  const stamp = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const after = new Date(close);
  after.setDate(after.getDate() + 1);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Deadline: ${opportunity.title}`,
    details: [opportunity.blurb, opportunity.url].filter(Boolean).join('\n\n'),
    dates: `${stamp(close)}/${stamp(after)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function icsText(value: string): string {
  return value.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');
}

function folded(line: string): string {
  const chunks = line.match(/.{1,74}/gu) ?? [''];
  return chunks.join('\r\n ');
}

export function icsFile(event: EventListing, now = Date.now()): string {
  const dates = calendarDates(event);
  const location = calendarLocation(event);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//membrs//membrs//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@membrs`,
    `DTSTAMP:${utcStamp(now)}`,
    ...(dates
      ? dates.allDay
        ? [`DTSTART;VALUE=DATE:${dates.start}`, `DTEND;VALUE=DATE:${dates.end}`]
        : [`DTSTART:${dates.start}`, `DTEND:${dates.end}`]
      : []),
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(details(event))}`,
    ...(location ? [`LOCATION:${icsText(location)}`] : []),
    ...(event.url ? [`URL:${event.url}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(folded).join('\r\n')}\r\n`;
}

export function downloadIcs(event: EventListing): void {
  const url = URL.createObjectURL(
    new Blob([icsFile(event)], { type: 'text/calendar;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(event.title) || 'event'}.ics`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
