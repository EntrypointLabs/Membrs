import { sessionStore } from './auth';
import { createStore } from './store';

/**
 * Which overlay is open. One at a time, so opening the digest from the footer
 * closes cookie settings and the other way round. 'auth' is the sign-up and
 * sign-in card; 'prefs' is its second step, city and interests.
 */
export type Overlay = 'auth' | 'prefs' | 'cookies' | 'plans' | null;

export const overlayStore = createStore<Overlay>(null, null);

export function openOverlay(overlay: Exclude<Overlay, null>): void {
  overlayStore.set(overlay);
}

/**
 * The single way into the Sunday Digest. There is no email form: the digest
 * belongs to an account, so readers who are signed out sign up first and
 * readers who are signed in go straight to their city and interests.
 */
export function openDigest(): void {
  overlayStore.set(sessionStore.get() ? 'prefs' : 'auth');
}

export function closeOverlay(): void {
  overlayStore.set(null);
}

/** A short confirmation at the bottom of the screen. */
export const toastStore = createStore<{ id: number; text: string } | null>(
  null,
  null,
);

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string): void {
  toastStore.set({ id: Date.now(), text });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastStore.set(null), 2600);
}
