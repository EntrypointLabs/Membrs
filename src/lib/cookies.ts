import { createStore } from './store';

/**
 * Cookie consent. Essential cookies are always on and need no consent;
 * analytics and marketing stay off until the reader turns them on. A null
 * choice means the banner has not been answered yet.
 */
export interface CookieChoice {
  analytics: boolean;
  marketing: boolean;
  /** When the choice was made, so it can expire after 12 months. */
  at: number;
}

const TWELVE_MONTHS = 365 * 24 * 60 * 60 * 1000;

export const cookieStore = createStore<CookieChoice | null>(
  'membrs.cookies',
  null,
);

export function isChoiceCurrent(
  choice: CookieChoice | null,
  now = Date.now(),
): boolean {
  return choice !== null && now - choice.at < TWELVE_MONTHS;
}

export function acceptAll(): void {
  cookieStore.set({ analytics: true, marketing: true, at: Date.now() });
}

export function rejectOptional(): void {
  cookieStore.set({ analytics: false, marketing: false, at: Date.now() });
}

export function saveChoice(analytics: boolean, marketing: boolean): void {
  cookieStore.set({ analytics, marketing, at: Date.now() });
}
