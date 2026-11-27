import type {
  DayLabel,
  EventSummary,
  ListingSummary,
  OpportunitySummary,
} from './types';

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
export const DAY_MS = 86_400_000;

export const CATALOGUE_ZONE = 'Africa/Lagos';
export const DEFAULT_EVENT_MS = 2 * 3_600_000;
const MINUTE_MS = 60_000;
const MAX_OFFSET_MS = 14 * 3_600_000;

const zoneClock = new Intl.DateTimeFormat('en-US', {
  timeZone: CATALOGUE_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
});

function zoneWallClock(at: number): number {
  const part = Object.fromEntries(
    zoneClock.formatToParts(new Date(at)).map((p) => [p.type, Number(p.value)]),
  );
  return Date.UTC(
    part.year ?? 0,
    (part.month ?? 1) - 1,
    part.day ?? 1,
    (part.hour ?? 0) % 24,
    part.minute ?? 0,
  );
}

function dayNumber(wallClock: number): number {
  return Math.floor(wallClock / DAY_MS);
}

export function clockMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(time.trim());
  if (!match) return null;
  const pm = match[3]!.toUpperCase() === 'PM';
  return ((Number(match[1]) % 12) + (pm ? 12 : 0)) * 60 + Number(match[2]);
}

export function eventOffset(event: EventSummary): number {
  if (!event.startsAt) return zoneWallClock(Date.now()) - Date.now();
  const starts = Date.parse(event.startsAt);
  const month = MONTHS.indexOf(event.date.month);
  for (const shift of [0, -1, 1]) {
    const day = new Date(starts + shift * DAY_MS);
    if (day.getUTCMonth() !== month || day.getUTCDate() !== event.date.day)
      continue;
    const wall =
      Date.UTC(day.getUTCFullYear(), month, event.date.day) +
      (clockMinutes(event.time) ?? 0) * MINUTE_MS;
    if (Math.abs(wall - starts) <= MAX_OFFSET_MS) return wall - starts;
  }
  return zoneWallClock(starts) - starts;
}

export function eventLocalDay(event: EventSummary, at: number): number {
  return dayNumber(at + eventOffset(event));
}

export interface CalendarToday {
  weekday: number;
  daysLeftInMonth: number;
}

let cachedToday: { minute: number; today: CalendarToday } | undefined;

export function calendarToday(now = Date.now()): CalendarToday {
  const minute = Math.floor(now / MINUTE_MS);
  if (cachedToday?.minute === minute) return cachedToday.today;
  const wall = new Date(zoneWallClock(now));
  const lastOfMonth = new Date(
    Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const today = {
    weekday: (wall.getUTCDay() + 6) % 7,
    daysLeftInMonth: lastOfMonth - wall.getUTCDate(),
  };
  cachedToday = { minute, today };
  return today;
}

export function weekendDays(today = calendarToday()): [number, number] {
  if (today.weekday === 6) return [0, 0];
  return [5 - today.weekday, 6 - today.weekday];
}

/**
 * The time tag an event wears on cards: Tonight, Tomorrow, or This weekend
 * when it lands on the coming Saturday or Sunday. Anything further out has no
 * tag, so the tags stay rare enough to mean something.
 */
export function eventTag(event: EventSummary): string {
  if (event.inDays === 0) return 'Tonight';
  if (event.inDays === 1) return 'Tomorrow';
  return isThisWeekend(event) ? 'This Weekend' : '';
}

export function eventDay(event: EventSummary, year = false): string {
  if (event.runUntil) return runDays(event.date, event.runUntil);
  const starts = event.startsAt ? new Date(event.startsAt) : null;
  const differs = starts && starts.getFullYear() !== new Date().getFullYear();
  return starts && (year || differs)
    ? `${shortDay(event.date)} ${starts.getFullYear()}`
    : shortDay(event.date);
}

function runDays(first: DayLabel, last: DayLabel): string {
  return first.month === last.month
    ? `${first.weekday} ${first.day} to ${last.weekday} ${last.day} ${last.month}`
    : `${shortDay(first)} to ${shortDay(last)}`;
}

/** "Sat 7 Nov" */
export function shortDay(label: DayLabel): string {
  return `${label.weekday} ${label.day} ${label.month}`;
}

/**
 * How urgent a deadline is. Three days or less is red, a week or less is
 * amber, anything further is the calm accent.
 */
export type Urgency = 'now' | 'soon' | 'later';

export function deadlineUrgency(daysLeft: number): Urgency {
  if (daysLeft <= 3) return 'now';
  if (daysLeft <= 7) return 'soon';
  return 'later';
}

export function hasDeadline(opportunity: OpportunitySummary): boolean {
  return opportunity.deadline.day > 0;
}

export function closesLine(opportunity: OpportunitySummary): string {
  return hasDeadline(opportunity)
    ? `Closes ${shortDay(opportunity.deadline)}`
    : 'No deadline';
}

/** One line for when a listing happens or closes. */
export function whenLine(listing: ListingSummary): string {
  return listing.kind === 'event'
    ? `${eventDay(listing)}, ${listing.time}`
    : closesLine(listing);
}

export function isThisWeekend(event: EventSummary): boolean {
  const [saturday, sunday] = weekendDays();
  return event.inDays >= saturday && event.inDays <= sunday;
}

export interface UrgencyLabel {
  text: string;
  urgency: Urgency;
}

const CLOSING_LABEL_DAYS = 7;

function eventUrgencyLabel(event: EventSummary): UrgencyLabel | null {
  const text = eventTag(event);
  if (!text) return null;
  return { text, urgency: event.inDays === 0 ? 'now' : 'soon' };
}

function closingUrgencyLabel(
  opportunity: OpportunitySummary,
): UrgencyLabel | null {
  const left = opportunity.daysLeft;
  if (!hasDeadline(opportunity) || left < 0 || left > CLOSING_LABEL_DAYS)
    return null;
  const text =
    left === 0
      ? 'Closes Today'
      : `Closes in ${left} ${left === 1 ? 'Day' : 'Days'}`;
  return { text, urgency: deadlineUrgency(left) };
}

export function isNewToday(listing: ListingSummary, now = Date.now()): boolean {
  const listed = Date.parse(listing.listedAt ?? '');
  return Number.isFinite(listed) && now - listed >= 0 && now - listed < DAY_MS;
}

export function urgencyLabel(
  listing: ListingSummary,
  now = Date.now(),
): UrgencyLabel | null {
  const timed =
    listing.kind === 'event'
      ? eventUrgencyLabel(listing)
      : closingUrgencyLabel(listing);
  if (timed) return timed;
  return isNewToday(listing, now)
    ? { text: 'New Today', urgency: 'later' }
    : null;
}
