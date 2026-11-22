import { sessionStore } from './auth';
import { EXIT_MS } from './motion';
import { tourSeenStore } from './preferences';
import { createStore } from './store';

/**
 * Which overlay is open. One at a time, so opening the digest from the footer
 * closes cookie settings and the other way round. 'prefs' is the weekly
 * email's city and interests.
 */
export type Overlay = 'prefs' | 'cookies' | 'plans' | 'assistant' | null;

export const overlayStore = createStore<Overlay>(null, null);

export function openOverlay(overlay: Exclude<Overlay, null>): void {
  overlayStore.set(overlay);
}

/**
 * The single way into the weekly email: the city and interests card, which
 * asks for the reader's email there if the browser does not know it yet.
 */
export function openDigest(): void {
  overlayStore.set('prefs');
}

function rememberReader(): void {
  if (sessionStore.get() && !tourSeenStore.get()) tourSeenStore.set(true);
}

rememberReader();
sessionStore.subscribe(rememberReader);

export function closeOverlay(): void {
  overlayStore.set(null);
}

export function tourDue(overlay: Overlay = overlayStore.get()): boolean {
  return overlay === null && !sessionStore.get() && !tourSeenStore.get();
}

export interface ToastItem {
  id: number;
  text: string;
}

export const toastStore = createStore<ToastItem | null>(null, null);

const SHORT_TOAST_MS = 3000;
const LONG_TOAST_MS = 8000;
const MAX_TOAST_MS = 12000;
const READING_MS_PER_CHAR = 60;
const REFERENCE = /\b[A-Z0-9]*\d[A-Z0-9]*[-_][A-Z0-9-]+\b|\b[A-Z0-9]{8,}\b|@/;

export function toastDuration(text: string): number {
  const floor = REFERENCE.test(text) ? LONG_TOAST_MS : SHORT_TOAST_MS;
  return Math.min(
    MAX_TOAST_MS,
    Math.max(floor, text.length * READING_MS_PER_CHAR),
  );
}

const toastQueue: ToastItem[] = [];
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let toastBusy = false;
let toastId = 0;

function showNextToast(): void {
  const next = toastQueue.shift();
  toastBusy = Boolean(next);
  if (!next) return;
  toastStore.set(next);
  toastTimer = setTimeout(dismissToast, toastDuration(next.text));
}

export function dismissToast(): void {
  if (!toastStore.get()) return;
  clearTimeout(toastTimer);
  toastStore.set(null);
  toastTimer = setTimeout(showNextToast, EXIT_MS);
}

export function toast(text: string): void {
  const current = toastStore.get();
  if (current?.text === text || toastQueue.some((t) => t.text === text)) return;
  toastQueue.push({ id: ++toastId, text });
  if (!toastBusy) showNextToast();
}

interface AppEntry {
  inApp?: boolean;
}

if (typeof window !== 'undefined') {
  window.addEventListener('locationchange', () => {
    if (!window.history.state)
      window.history.replaceState({ inApp: true } satisfies AppEntry, '');
  });
}

export function cameFromApp(): boolean {
  return (window.history.state as AppEntry | null)?.inApp === true;
}

export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return copyWithSelection(text);
    }
  }
  return copyWithSelection(text);
}

function copyWithSelection(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  field.setSelectionRange(0, text.length);
  const copied = document.execCommand('copy');
  field.remove();
  return copied;
}
