import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE = 'http://api.test/api';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function live() {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE', BASE);
  const api = await import('./api');
  const auth = await import('./auth');
  const outbox = await import('./outbox');
  const ui = await import('./ui');
  const preferences = await import('./preferences');
  return { api, auth, outbox, ui, preferences };
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('one queued submission per form', () => {
  it('replaces an earlier attempt instead of queueing a second copy', async () => {
    const { api, outbox } = await live();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(json({ data: {} }, 202))),
    );
    expect(await api.submitContribution('event', { name: 'Gig' })).toBe(
      'signedOut',
    );
    expect(await api.submitContribution('event', { name: 'Gig, edited' })).toBe(
      'signedOut',
    );
    await api.submitContribution('place', { name: 'Park' });
    const queued = outbox.outboxStore.get();
    expect(queued).toHaveLength(2);
    expect(queued.map((w) => JSON.parse(w.body).kind)).toEqual([
      'event',
      'place',
    ]);
    expect(JSON.parse(queued[0]!.body)).toEqual({
      kind: 'event',
      values: { name: 'Gig, edited' },
    });
  });

  it('reports which form a flush delivered so its screen can confirm', async () => {
    const { api, auth, outbox } = await live();
    const fetch = vi.fn(() => Promise.resolve(json({ data: {} }, 202)));
    vi.stubGlobal('fetch', fetch);
    await api.submitContribution('event', { name: 'Gig' });
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    await outbox.flushOutbox();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(outbox.sentSlotsStore.get()).toEqual([
      api.contributionSlot('event'),
    ]);
    outbox.consumeSent(api.contributionSlot('event'));
    expect(outbox.sentSlotsStore.get()).toEqual([]);
  });

  it('can drop a form whose sender has to sign in first', async () => {
    const { api, outbox } = await live();
    await api.submitContribution('event', { name: 'Gig' });
    outbox.discardSlot(api.contributionSlot('event'));
    expect(outbox.outboxStore.get()).toEqual([]);
  });
});

describe('a write that keeps failing', () => {
  it('backs off, then drops it and tells the reader', async () => {
    vi.useFakeTimers();
    const { api, auth, outbox, ui } = await live();
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    const fetch = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith('/v1/me/contributions')
          ? json({}, 503)
          : json({ data: {} }, 200),
      ),
    );
    vi.stubGlobal('fetch', fetch);
    expect(await api.submitContribution('event', { name: 'Gig' })).toBe(
      'queued',
    );
    for (let i = 1; i < outbox.MAX_ATTEMPTS; i++) {
      vi.advanceTimersByTime(60_000);
      await outbox.flushOutbox();
    }
    expect(outbox.outboxStore.get()).toEqual([]);
    expect(ui.toastStore.get()?.text).toMatch(/Could not send your submission/);
    expect(fetch).toHaveBeenCalledTimes(outbox.MAX_ATTEMPTS);
  });

  it('does not hold back the writes queued behind it', async () => {
    vi.useFakeTimers();
    const { auth, outbox } = await live();
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    const sent: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        sent.push(url);
        return Promise.resolve(
          url.endsWith('/v1/me/contributions')
            ? json({}, 500)
            : json({ data: {} }, 200),
        );
      }),
    );
    outbox.outboxStore.set([
      { key: 'a', method: 'POST', path: '/v1/me/contributions', body: '{}' },
      { key: 'b', method: 'PUT', path: '/v1/me/interests', body: '{}' },
    ]);
    await outbox.flushOutbox();
    expect(sent).toEqual([
      `${BASE}/v1/me/contributions`,
      `${BASE}/v1/me/interests`,
    ]);
    expect(outbox.outboxStore.get().map((w) => w.key)).toEqual(['a']);
    expect(outbox.outboxStore.get()[0]!.attempts).toBe(1);
  });
});

describe('signing out', () => {
  it('forgets the reader: digest, picks, fields, drafts and queued writes', async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
      addEventListener: () => undefined,
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => void storage.set(key, value),
        removeItem: (key: string) => void storage.delete(key),
      },
    });
    const { api, auth, outbox, preferences } = await live();
    const drafts = await import('./drafts');
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(json({}, 503))),
    );
    await api.submitContribution('event', { name: 'Gig' });
    preferences.subscriptionStore.set({ email: 'a@b.co', city: 'Lagos' });
    preferences.interestsStore.set(['Film']);
    preferences.fieldsStore.set(['Law']);
    drafts.writeDraft('event', {
      values: { name: 'Gig' },
      picked: {},
      days: 7,
      agreed: false,
    });
    auth.forgetEmail();
    expect(auth.sessionStore.get()).toBeNull();
    expect(outbox.outboxStore.get()).toEqual([]);
    expect(preferences.subscriptionStore.get()).toBeNull();
    expect(preferences.interestsStore.get()).not.toContain('Film');
    expect(preferences.fieldsStore.get()).toEqual([]);
    expect(drafts.readDraft('event')).toBeNull();
  });
});
