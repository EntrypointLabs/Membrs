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

const session = {
  accessToken: 't',
  account: { id: 'u', email: 'reader@example.com', displayName: 'reader' },
} as Session;

beforeEach(() => {
  saved = new Map();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('the weekly email', () => {
  it('always opens on its city and interests card', async () => {
    const { ui } = await visit();
    ui.openDigest();
    expect(ui.overlayStore.get()).toBe('prefs');
  });
});

describe('onboarding tour', () => {
  it('starts on a first visit with nothing else open', async () => {
    const { ui } = await visit();
    expect(ui.tourDue()).toBe(true);
    ui.openDigest();
    expect(ui.tourDue()).toBe(false);
  });

  it('never repeats after it is finished or skipped', async () => {
    const first = await visit();
    first.preferences.tourSeenStore.set(true);
    expect(first.ui.tourDue()).toBe(false);
    const next = await visit();
    expect(next.ui.tourDue()).toBe(false);
  });

  it('never starts for a reader the browser already knows', async () => {
    saved.set('membrs.user', JSON.stringify(session));
    const { ui } = await visit();
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
