import { WEEKDAYS } from './dates';
import type { OpeningHours, Place } from './types';

/** Decimal hours to a clock label: 8.5 is "8:30 AM", 17 is "5 PM". */
export function clockLabel(hours: number): string {
  const minutes = Math.round(hours * 60);
  const h24 = Math.floor(minutes / 60) % 24;
  const mm = minutes % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return mm
    ? `${h12}:${String(mm).padStart(2, '0')} ${suffix}`
    : `${h12} ${suffix}`;
}

export function rangeLabel(span: OpeningHours | null | undefined): string {
  return span
    ? `${clockLabel(span.opens)} to ${clockLabel(span.closes)}`
    : 'Closed';
}

export interface OpenState {
  open: boolean;
  /** Open, but closing within the hour. */
  closingSoon: boolean;
  /** "Open now", "Closing soon" or "Closed". */
  label: string;
  /** "Closes 5 PM", "Opens tomorrow 9 AM". */
  detail: string;
}

/**
 * Whether a place is open at a moment. `weekday` is Monday-first (0 is
 * Monday) and `hour` is decimal, so the function stays pure and testable;
 * openStateNow() feeds it the real clock.
 */
export function openState(
  place: Place,
  weekday: number,
  hour: number,
): OpenState {
  const today = place.hours[weekday];
  if (today && hour >= today.opens && hour < today.closes) {
    const closingSoon = today.closes - hour <= 1;
    return {
      open: true,
      closingSoon,
      label: closingSoon ? 'Closing soon' : 'Open now',
      detail: `Closes ${clockLabel(today.closes)}`,
    };
  }
  if (today && hour < today.opens) {
    return {
      open: false,
      closingSoon: false,
      label: 'Closed',
      detail: `Opens ${clockLabel(today.opens)}`,
    };
  }
  for (let k = 1; k <= 7; k++) {
    const day = (weekday + k) % 7;
    const next = place.hours[day];
    if (next) {
      const when = k === 1 ? 'tomorrow' : WEEKDAYS[day];
      return {
        open: false,
        closingSoon: false,
        label: 'Closed',
        detail: `Opens ${when} ${clockLabel(next.opens)}`,
      };
    }
  }
  return {
    open: false,
    closingSoon: false,
    label: 'Closed',
    detail: 'Hours not listed',
  };
}

export function openStateNow(place: Place, now = new Date()): OpenState {
  const weekday = (now.getDay() + 6) % 7;
  return openState(place, weekday, now.getHours() + now.getMinutes() / 60);
}

export function isFreeEntry(place: Place): boolean {
  return /^Free/.test(place.entry);
}
