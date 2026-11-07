import { createStore } from './store';

/**
 * Which overlay is open. One at a time, so opening the digest signup from the
 * footer closes cookie settings and the other way round.
 */
export type Overlay = 'digest' | 'cookies' | 'plans' | 'auth' | null;

export const overlayStore = createStore<Overlay>(null, null);

export function openOverlay(overlay: Exclude<Overlay, null>): void {
  overlayStore.set(overlay);
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
