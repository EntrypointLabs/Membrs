import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from './auth';

let saved: Map<string, string>;

function stubBrowser() {
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => void saved.set(key, value),
      removeItem: (key: string) => void saved.delete(key),
    },
    addEventListener: () => undefined,
    history: { state: null, replaceState: () => undefined },
  });
}

async function visit() {
  vi.resetModules();
  stubBrowser();
  const ui = await import('./ui');
  const auth = await import('./auth');
  const preferences = await import('./preferences');
  return { ui, auth, preferences };
}

const session = { provider: 'google', accessToken: 't' } as Session;

beforeEach(() => {
  saved = new Map();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('sign-up card', () => {
  it('auto-opens on a first visit', async () => {
    const { ui } = await visit();
    ui.autoPromptSignUp();
    expect(ui.overlayStore.get()).toBe('auth');
  });

  it('never auto-opens again once dismissed', async () => {
    const first = await visit();
    first.ui.autoPromptSignUp();
    first.ui.closeOverlay();
    first.ui.autoPromptSignUp();
    expect(first.ui.overlayStore.get()).toBeNull();
    const next = await visit();
    next.ui.autoPromptSignUp();
    expect(next.ui.overlayStore.get()).toBeNull();
  });

  it('never auto-opens after the reader has signed in, even signed out', async () => {
    const first = await visit();
    first.auth.sessionStore.set(session);
    first.auth.sessionStore.set(null);
    const next = await visit();
    next.ui.autoPromptSignUp();
    expect(next.ui.overlayStore.get()).toBeNull();
  });

  it('still opens on demand', async () => {
    const first = await visit();
    first.ui.autoPromptSignUp();
    first.ui.closeOverlay();
    first.ui.openDigest();
    expect(first.ui.overlayStore.get()).toBe('auth');
  });
});

describe('onboarding tour', () => {
  it('waits until the sign-up card has been dismissed', async () => {
    const { ui } = await visit();
    expect(ui.tourDue()).toBe(false);
    ui.autoPromptSignUp();
    expect(ui.tourDue()).toBe(false);
    ui.closeOverlay();
    expect(ui.tourDue()).toBe(true);
  });

  it('never repeats after it is finished or skipped', async () => {
    const first = await visit();
    first.ui.autoPromptSignUp();
    first.ui.closeOverlay();
    first.preferences.tourSeenStore.set(true);
    expect(first.ui.tourDue()).toBe(false);
    const next = await visit();
    next.ui.autoPromptSignUp();
    expect(next.ui.overlayStore.get()).toBeNull();
    expect(next.ui.tourDue()).toBe(false);
  });

  it('never starts for a signed-in reader on a new device', async () => {
    saved.set('membrs.user', JSON.stringify(session));
    const { ui } = await visit();
    ui.autoPromptSignUp();
    expect(ui.overlayStore.get()).toBeNull();
    expect(ui.tourDue()).toBe(false);
  });
});

describe('toasts', () => {
  it('gives references and long messages more time', async () => {
    const { ui } = await visit();
    expect(ui.toastDuration('Link copied')).toBe(3000);
    expect(
      ui.toastDuration('We are still confirming payment for MBR-123-ABC.'),
    ).toBeGreaterThanOrEqual(8000);
  });

  it('queues the next toast behind the current one', async () => {
    vi.useFakeTimers();
    const { ui } = await visit();
    ui.toast('First');
    ui.toast('Second');
    ui.toast('Second');
    expect(ui.toastStore.get()?.text).toBe('First');
    vi.advanceTimersByTime(3000);
    expect(ui.toastStore.get()).toBeNull();
    vi.advanceTimersByTime(250);
    expect(ui.toastStore.get()?.text).toBe('Second');
    vi.advanceTimersByTime(3250);
    expect(ui.toastStore.get()).toBeNull();
  });
});
