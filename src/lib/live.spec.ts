import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import listingsFixture from '../fixtures/listings.json';

const BASE = 'http://api.test/api';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockFetch(handler: Handler) {
  const fn = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) =>
    Promise.resolve(handler(String(input), init)),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

async function live() {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE', BASE);
  const api = await import('./api');
  const auth = await import('./auth');
  const outbox = await import('./outbox');
  return { api, auth, outbox };
}

const establishment = {
  id: 'e1',
  name: 'Freedom Park',
  kind: 'outdoor',
  categories: [],
  tags: [],
  description: 'Open-air park.',
  address: 'Broad Street, Lagos Island',
  city: 'Lagos',
  websiteUrl: '',
  openingHours: { Sat: { opens: 9, closes: 18 } },
  amenities: [],
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function page(items: unknown[]) {
  return json({
    data: { total: items.length, items, facets: [], sections: [] },
  });
}

const FEED = `${BASE}/v1/listings/feed?kind=event&limit=12`;

describe('without VITE_API_BASE', () => {
  it('never calls the network and shows no sample data', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_BASE', '');
    const fetch = mockFetch(() => json([]));
    const api = await import('./api');
    await api.loadVenuesIfShown();
    await api.loadSummary();
    await api.submitContribution('event', { name: 'x' });
    await api.subscribe({ email: 'a', city: 'Lagos', interests: ['Music'] });
    expect(fetch).not.toHaveBeenCalled();
    expect(api.knownListings()).toHaveLength(0);
    expect(api.places()).toHaveLength(0);
    expect(api.promos()).toHaveLength(0);
  });
});

describe('loadResource', () => {
  async function resources() {
    const { api } = await live();
    const loaded = await import('./resources');
    return { api, loaded };
  }

  it('remembers every listing a page carries, so a card can open it', async () => {
    const { api, loaded } = await resources();
    const listing = { ...listingsFixture[0]!, id: 'live-1', slug: 'live-one' };
    mockFetch(() => page([listing]));
    await loaded.loadResource(feedPathOf(api));
    expect(api.listingByKey('live-1')?.title).toBe(listing.title);
    expect(api.listingByKey('live-one')?.id).toBe('live-1');
  });

  it('reports a failed load and loads again on retry', async () => {
    const { api, loaded } = await resources();
    mockFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    await expect(loaded.loadResource(feedPathOf(api), [])).rejects.toThrow();
    expect(api.catalogueStore.get().status).toBe('failed');
    mockFetch(() => page([]));
    loaded.retryResource(feedPathOf(api));
    await vi.waitFor(() =>
      expect(api.catalogueStore.get().status).toBe('ready'),
    );
  });

  it('retries a down API with backoff', async () => {
    const { api, loaded } = await resources();
    let calls = 0;
    mockFetch(() => (++calls < 3 ? json({}, 503) : page([])));
    await loaded.loadResource(feedPathOf(api), [1, 1, 1]);
    expect(calls).toBe(3);
    expect(api.catalogueStore.get().status).toBe('ready');
  });

  it('settles on failed once every retry has failed', async () => {
    const { api, loaded } = await resources();
    const fetch = mockFetch(() => json({}, 500));
    await expect(
      loaded.loadResource(feedPathOf(api), [1, 1]),
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(api.catalogueStore.get().status).toBe('failed');
  });

  it('does not retry an answer a retry cannot change', async () => {
    const { api, loaded } = await resources();
    const fetch = mockFetch(() => json({}, 404));
    await expect(
      loaded.loadResource(feedPathOf(api), [1, 1]),
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('joins a load already running instead of starting another', async () => {
    const { api, loaded } = await resources();
    const fetch = mockFetch(() => page([]));
    await Promise.all([
      loaded.loadResource(feedPathOf(api)),
      loaded.loadResource(feedPathOf(api)),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('asks for one canonical address however the picks are ordered', async () => {
    const { api } = await live();
    const one = api.feedPath({
      kind: 'event',
      picks: { state: 'Lagos', type: 'music' },
    });
    const two = api.feedPath({
      kind: 'event',
      picks: { type: 'music', state: 'Lagos' },
    });
    expect(one).toBe(two);
    expect(one).toBe('/v1/listings/feed?kind=event&state=Lagos&type=music');
  });
});

function feedPathOf(api: typeof import('./api')): string {
  const path = api.feedPath({ kind: 'event', limit: 12 });
  expect(`${BASE}${path}`).toBe(FEED);
  return path;
}

describe('venues', () => {
  it('loads places and promos only when they are shown', async () => {
    vi.doMock('./sections', () => ({ shown: () => true }));
    const { api } = await live();
    vi.doUnmock('./sections');
    const fetch = mockFetch((url) => {
      if (url.startsWith(`${BASE}/v1/establishments`))
        return json({
          data: {
            establishments: [establishment],
            total: 1,
            limit: 100,
            offset: 0,
          },
        });
      return json({
        data: {
          deals: [
            {
              id: 'd1',
              title: 'Free entry',
              description: '',
              discount: {
                kind: 'freebie',
                percent: null,
                amount: null,
                currency: '',
              },
              code: 'PARK',
              city: '',
              establishmentId: 'e1',
              startsAt: null,
              endsAt: null,
            },
          ],
          total: 1,
          limit: 100,
          offset: 0,
        },
      });
    });
    await api.loadVenuesIfShown();
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/v1/establishments?limit=100&offset=0`,
      expect.anything(),
    );
    expect(api.places().map((p) => p.type)).toEqual(['Parks & gardens']);
    expect(api.promos()[0]).toMatchObject({
      merchant: 'Freedom Park',
      code: 'PARK',
    });
  });

  it('counts categories from the catalogue summary', async () => {
    const { api } = await live();
    mockFetch(() =>
      json({
        data: {
          counts: { event: 4, opportunity: 0 },
          categories: [
            {
              kind: 'event',
              name: 'Music',
              slug: 'music',
              count: 4,
              cover: '',
            },
          ],
          cities: [],
        },
      }),
    );
    await api.loadSummary();
    expect(api.categories().find((c) => c.name === 'Music')?.count).toBe(4);
  });
});

describe('writes', () => {
  it('posts a contribution with an Idempotency-Key and reuses it on retry', async () => {
    const { api, auth, outbox } = await live();
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    const keys: string[] = [];
    let attempts = 0;
    mockFetch((url, init) => {
      const headers = new Headers(init.headers);
      expect(url).toBe(`${BASE}/v1/me/contributions`);
      expect(headers.get('X-Auth-Token')).toBe('t1');
      expect(JSON.parse(String(init.body))).toEqual({
        kind: 'place',
        values: { name: 'Freedom Park' },
      });
      keys.push(headers.get('Idempotency-Key') ?? '');
      attempts++;
      return attempts === 1 ? json({}, 503) : json({ data: {} }, 202);
    });
    expect(
      await api.submitContribution('place', { name: 'Freedom Park' }),
    ).toBe('queued');
    expect(outbox.outboxStore.get()).toHaveLength(1);
    expect(
      await api.submitContribution('place', { name: 'Freedom Park' }),
    ).toBe('sent');
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(outbox.outboxStore.get()).toHaveLength(0);
  });

  it('holds writes while signed out and sends them once a token exists', async () => {
    const { api, auth, outbox } = await live();
    const fetch = mockFetch(() => json({ data: {} }, 202));
    expect(await api.submitContribution('event', { name: 'Gig' })).toBe(
      'signedOut',
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(outbox.outboxStore.get()).toHaveLength(1);
    const key = outbox.outboxStore.get()[0]!.key;
    auth.sessionStore.set({ at: 0, accessToken: 't2' });
    await outbox.flushOutbox();
    expect(
      new Headers(fetch.mock.calls[0]![1]!.headers).get('Idempotency-Key'),
    ).toBe(key);
    expect(outbox.outboxStore.get()).toHaveLength(0);
  });

  it('drops and reports a write the API rejects', async () => {
    const { api, auth, outbox } = await live();
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    mockFetch(() =>
      json(
        { error: { code: 'badRequest', message: 'link must be a web link' } },
        400,
      ),
    );
    await expect(
      api.submitContribution('event', { link: 'nope' }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'badRequest',
      message: 'link must be a web link',
    });
    expect(outbox.outboxStore.get()).toHaveLength(0);
  });

  it('refreshes an expired token and replays with the same key', async () => {
    const { api, auth } = await live();
    auth.sessionStore.set({
      at: 0,
      accessToken: 'old',
      refreshToken: 'r1',
    });
    const calls: { url: string; token: string | null; key: string | null }[] =
      [];
    mockFetch((url, init) => {
      const headers = new Headers(init.headers);
      calls.push({
        url,
        token: headers.get('X-Auth-Token'),
        key: headers.get('Idempotency-Key'),
      });
      if (url.endsWith('/v1/auth/refresh'))
        return json({
          data: {
            accessToken: 'new',
            accessTokenExpiresAt: '',
            refreshToken: 'r2',
            refreshTokenExpiresAt: '',
            account: { id: 'u', email: 'a@b.c', displayName: 'A' },
          },
        });
      return headers.get('X-Auth-Token') === 'old'
        ? json({}, 401)
        : json({ data: {} }, 202);
    });
    const stored = {
      at: 0,
      accessToken: 'old',
      refreshToken: 'r1',
    };
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => JSON.stringify(stored),
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });
    await api.submitContribution('promo', { name: 'Deal' });
    expect(calls.map((c) => c.token ?? 'refresh')).toEqual([
      'old',
      'refresh',
      'new',
    ]);
    expect(calls[2]!.key).toBe(calls[0]!.key);
    expect(auth.sessionStore.get()?.refreshToken).toBe('r2');
  });

  it('subscribes by saving interests then the digest preference', async () => {
    const { api, auth } = await live();
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    const sent: { method?: string; url: string; body: unknown }[] = [];
    mockFetch((url, init) => {
      if (!init.method)
        return json({
          data: {
            subscribed: false,
            frequency: 'monthly',
            city: null,
            interests: [],
          },
        });
      sent.push({
        method: init.method,
        url,
        body: JSON.parse(String(init.body)),
      });
      return json({ data: {} });
    });
    await api.subscribe({
      email: 'google account',
      city: 'Accra',
      interests: ['Music', 'Grants', 'Beaches', 'Unknown'],
    });
    expect(sent).toEqual([
      {
        method: 'PUT',
        url: `${BASE}/v1/me/interests`,
        body: {
          interests: [
            { kind: 'event', category: 'Music' },
            { kind: 'opportunity', category: 'Grants' },
            { kind: 'place', category: 'Beaches' },
          ],
        },
      },
      {
        method: 'PUT',
        url: `${BASE}/v1/me/newsletter`,
        body: {
          subscribed: true,
          frequency: 'monthly',
          city: 'Accra',
          interests: [],
        },
      },
    ]);
  });

  it('hydrates interests and the digest from the account', async () => {
    const { api, auth } = await live();
    const prefs = await import('./preferences');
    auth.sessionStore.set({
      at: 0,
      accessToken: 't1',
      account: { id: 'u', email: 'reader@example.com', displayName: 'R' },
    });
    mockFetch((url) =>
      url.endsWith('/v1/me/for-you')
        ? json([{ id: 'comedy-night', slug: 'comedy-night', kind: 'event' }])
        : url.endsWith('/v1/me/interests')
          ? json({
              data: { interests: [{ kind: 'event', category: 'Comedy' }] },
            })
          : json({
              data: {
                subscribed: true,
                frequency: 'weekly',
                city: 'Abuja',
                interests: [],
              },
            }),
    );
    await api.loadAccount();
    expect(prefs.interestsStore.get()).toEqual(['Comedy']);
    expect(api.forYouStore.get().map((l) => l.id)).toEqual(['comedy-night']);
    expect(prefs.cityStore.get()).toBe('Abuja');
    expect(prefs.subscriptionStore.get()).toEqual({
      email: 'reader@example.com',
      city: 'Abuja',
    });
  });
});

describe('readerKnown', () => {
  it('needs an access token before a feature can skip asking for the email', async () => {
    const { auth } = await live();
    expect(auth.readerKnown(null)).toBe(false);
    expect(auth.readerKnown({ at: 1 })).toBe(false);
    expect(auth.readerKnown({ at: 1, accessToken: 'a' })).toBe(true);
  });
});

describe('startReaderSession', () => {
  it('posts the normalised email and stores the session', async () => {
    const { auth } = await live();
    const fetch = mockFetch(() =>
      json({
        data: {
          accessToken: 'a',
          accessTokenExpiresAt: '',
          refreshToken: 'r',
          refreshTokenExpiresAt: '',
          account: { id: 'u', email: 'ada@example.com', displayName: 'ada' },
        },
      }),
    );
    await auth.startReaderSession('  Ada@Example.com ');
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe(`${BASE}/v1/auth/email`);
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'ada@example.com',
    });
    expect(auth.sessionStore.get()?.accessToken).toBe('a');
  });

  it('refuses an address that cannot be an email without calling the API', async () => {
    const { auth } = await live();
    const fetch = mockFetch(() => json({}));
    await expect(auth.startReaderSession('ada@example')).rejects.toBeInstanceOf(
      auth.EmailNotAcceptedError,
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(auth.sessionStore.get()).toBeNull();
  });

  it('shows the server reason and stays signed out when the API refuses', async () => {
    const { auth } = await live();
    mockFetch(() =>
      json(
        { error: { code: 'tooManyRequests', message: 'Slow down a little.' } },
        429,
      ),
    );
    await expect(auth.startReaderSession('ada@example.com')).rejects.toThrow(
      'Slow down a little.',
    );
    expect(auth.sessionStore.get()).toBeNull();
  });
});

describe('searchCataloguePage', () => {
  it('ranks listings by the API score, resolves them in one feed call and skips hidden sections', async () => {
    const { api } = await live();
    const listing = { ...listingsFixture[0]!, id: 'found', slug: 'found' };
    const fetch = mockFetch((url) => {
      if (url.includes('/v1/listings/feed')) return page([listing]);
      const results = url.includes('/v1/events/search')
        ? [{ id: 'found', score: 0.01 }]
        : [];
      return json({ data: { query: 'lagos', results } });
    });
    const { hits } = await api.searchCataloguePage(' lagos ', 0);
    const searched = fetch.mock.calls.map(([url]) => String(url));
    expect(searched).toContain(
      `${BASE}/v1/opportunities/search?q=lagos&limit=50`,
    );
    expect(searched).toContain(
      `${BASE}/v1/listings/feed?kind=all&ids=found&limit=100`,
    );
    expect(searched.some((u) => u.includes('/v1/establishments/search'))).toBe(
      false,
    );
    expect(hits.map((h) => [h.kind, h.item.id])).toEqual([
      ['listing', 'found'],
    ]);
  });

  it('finds nothing rather than a stale local guess when the API fails', async () => {
    const { api } = await live();
    mockFetch(() => json({ error: { code: 'internal' } }, 500));
    expect(await api.searchCataloguePage('lagos', 0)).toEqual({
      hits: [],
      more: false,
    });
  });
});

describe('ad requests', () => {
  const photo = () =>
    new Response('jpeg-bytes', { headers: { 'content-type': 'image/jpeg' } });

  it('uploads the photo, completes it and files the ad with payment details', async () => {
    const { api, auth } = await live();
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    const keys: string[] = [];
    const fetch = mockFetch((url, init) => {
      if (url === 'blob:local/photo') return photo();
      if (url === 'http://s3.test/put') {
        expect(init.method).toBe('PUT');
        expect(new Headers(init.headers).get('Content-Type')).toBe(
          'image/jpeg',
        );
        return new Response(null, { status: 200 });
      }
      keys.push(new Headers(init.headers).get('Idempotency-Key') ?? '');
      if (url === `${BASE}/v1/media/uploads`) {
        expect(JSON.parse(String(init.body))).toEqual({
          kind: 'cover',
          contentType: 'image/jpeg',
        });
        return json(
          {
            data: {
              imageId: 'img1',
              uploadUrl: 'http://s3.test/put',
              method: 'PUT',
              headers: { 'Content-Type': 'image/jpeg' },
            },
          },
          201,
        );
      }
      if (url === `${BASE}/v1/media/uploads/img1/complete`)
        return json({ data: { url: 'http://cdn.test/img1.jpg', ready: true } });
      if (url === `${BASE}/v1/me/contributions`) {
        expect(JSON.parse(String(init.body))).toEqual({
          kind: 'ad',
          values: {
            name: 'Ada',
            photo: 'http://cdn.test/img1.jpg',
            days: '14',
            reference: 'AD-1',
          },
        });
        return json({ data: { kind: 'ad', status: 'pending' } }, 202);
      }
      return json({}, 404);
    });
    const url = await api.uploadPhoto('blob:local/photo');
    expect(url).toBe('http://cdn.test/img1.jpg');
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(
      await api.submitAdRequest(
        { name: 'Ada' },
        { photo: url, days: 14, reference: 'AD-1' },
      ),
    ).toBe('sent');
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('refuses photo types the API will not store', async () => {
    const { api, auth } = await live();
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    mockFetch(
      () => new Response('gif', { headers: { 'content-type': 'image/gif' } }),
    );
    await expect(api.uploadPhoto('blob:local/gif')).rejects.toThrow(
      'Use a JPG, PNG or WebP photo.',
    );
  });

  it('needs a session before uploading', async () => {
    const { api, auth } = await live();
    mockFetch(photo);
    await expect(api.uploadPhoto('blob:local/photo')).rejects.toBeInstanceOf(
      auth.SignedOutError,
    );
  });
});

describe('ad checkout', () => {
  const order = {
    quote: {
      placement: 'Home' as const,
      rate: 15000,
      days: 7,
      subtotal: 105000,
      discount: 0,
      total: 105000,
    },
    values: { name: 'Ada' },
    photo: 'http://cdn.test/img1.jpg',
  };

  it('starts checkout with the session token and reuses its key on retry', async () => {
    const { auth } = await live();
    const payments = await import('./payments');
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    const keys: string[] = [];
    mockFetch((url, init) => {
      expect(url).toBe(`${BASE}/v1/ads/checkout`);
      const headers = new Headers(init.headers);
      expect(headers.get('X-Auth-Token')).toBe('t1');
      keys.push(headers.get('Idempotency-Key') ?? '');
      expect(JSON.parse(String(init.body))).toEqual({
        placement: 'Home',
        days: 7,
        values: { name: 'Ada' },
        photo: 'http://cdn.test/img1.jpg',
      });
      return json({
        data: {
          checkoutUrl: 'https://checkout.bachs.io/c/1',
          reference: 'AD-7K2Q9X',
          total: '105000',
        },
      });
    });
    expect(await payments.startAdCheckout(order)).toMatchObject({
      checkoutUrl: 'https://checkout.bachs.io/c/1',
      reference: 'AD-7K2Q9X',
    });
    await payments.startAdCheckout(order);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  it('surfaces the server message when payments are unavailable', async () => {
    const { auth } = await live();
    const payments = await import('./payments');
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    mockFetch(() =>
      json(
        {
          error: {
            code: 'serviceUnavailable',
            message: 'ad payments are not available yet, try again later',
          },
        },
        503,
      ),
    );
    await expect(payments.startAdCheckout(order)).rejects.toMatchObject({
      status: 503,
      message: 'ad payments are not available yet, try again later',
    });
  });

  it('reads an order status for its owner', async () => {
    const { auth } = await live();
    const payments = await import('./payments');
    auth.sessionStore.set({ at: 0, accessToken: 't1' });
    mockFetch((url) => {
      expect(url).toBe(`${BASE}/v1/me/ads/orders/AD-7K2Q9X`);
      return json({ data: { reference: 'AD-7K2Q9X', status: 'paid' } });
    });
    expect(await payments.orderStatus('AD-7K2Q9X')).toBe('paid');
  });
});
