import { beforeAll, describe, expect, it, vi } from 'vitest';
import listingsFixture from '../fixtures/listings.json';
import type { Listing } from './types';

type Api = typeof import('./api');
let api: Api;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-08T08:00:00'));
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE', 'http://api.test/api');
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    const body = String(input).endsWith('/v1/listings')
      ? listingsFixture
      : { data: { establishments: [], deals: [], total: 0 } };
    return Promise.resolve(new Response(JSON.stringify(body)));
  });
  api = await import('./api');
  await api.loadCatalogue();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('catalogue', () => {
  it('carries the categories', () => {
    expect(api.categories().length).toBeGreaterThan(0);
  });
});

describe('feeds', () => {
  it('alternates two lists, letting the longer one run on', () => {
    expect(api.alternated([1, 3, 5, 7], [2, 4])).toEqual([1, 2, 3, 4, 5, 7]);
  });

  it('mixes events and opportunities in the all view', () => {
    const kinds = api.within(30).map((l) => l.kind);
    const pairs = Math.min(
      kinds.filter((k) => k === 'event').length,
      kinds.filter((k) => k === 'opportunity').length,
    );
    expect(kinds.slice(0, pairs * 2)).toEqual(
      Array.from({ length: pairs * 2 }, (_, i) =>
        i % 2 ? 'opportunity' : 'event',
      ),
    );
  });

  it('filters by kind', () => {
    expect(api.feed('event').every((l) => l.kind === 'event')).toBe(true);
  });

  it('sorts closing soon by nearest deadline', () => {
    const days = api
      .closingSoon()
      .map((l) => (l.kind === 'opportunity' ? l.daysLeft : -1));
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('keeps Most Popular clear of what the carousel already shows', () => {
    const first = api.mostPopular(1)[0]!;
    expect(
      api.mostPopular(7, new Set([first.id])).map((l) => l.id),
    ).not.toContain(first.id);
  });

  it('fills Most Popular to the full count when few listings are trending', () => {
    const count = Math.min(10, api.listings().length);
    expect(api.mostPopular(count)).toHaveLength(count);
  });

  it('never suggests the listing you are on', () => {
    const l = api.listings()[0]!;
    expect(api.similar(l).map((s) => s.id)).not.toContain(l.id);
  });
});

function sample(
  kind: 'event' | 'opportunity',
  id: string,
  days: number,
  extra: Partial<Listing> = {},
): Listing {
  const base = (listingsFixture as Listing[]).find((l) => l.kind === kind)!;
  const when =
    kind === 'event'
      ? { inDays: days, trending: false }
      : { daysLeft: days, trending: false };
  return { ...base, ...when, id, listedRank: 0, ...extra } as Listing;
}

describe('heroPicks', () => {
  it('leads with soon and trending events over the lowest listed rank', () => {
    const pool = [
      sample('event', 'far-first', 734, { listedRank: 0, trending: true }),
      sample('event', 'soon', 5, { listedRank: 9 }),
      sample('event', 'trending', 20, { listedRank: 8, trending: true }),
      sample('event', 'later', 40, { listedRank: 7 }),
    ];
    expect(api.heroPicks(3, pool).map((l) => l.id)).toEqual([
      'trending',
      'soon',
      'later',
    ]);
  });

  it('only reaches past sixty days when nothing sooner is left', () => {
    const pool = [
      sample('event', 'far', 400),
      sample('event', 'farther', 734),
      sample('event', 'near', 10),
    ];
    expect(api.heroPicks(3, pool).map((l) => l.id)).toEqual([
      'near',
      'far',
      'farther',
    ]);
  });

  it('never picks opportunities', () => {
    const pool = [sample('opportunity', 'o', 1), sample('event', 'e', 30)];
    expect(api.heroPicks(3, pool).map((l) => l.id)).toEqual(['e']);
  });
});

describe('similar', () => {
  const shown = sample('event', 'shown', 3, { category: 'Music' });

  it('keeps to the same kind, same category first, soonest first', () => {
    const pool = [
      shown,
      sample('opportunity', 'other-kind', 1, { category: 'Music' }),
      sample('event', 'other-cat', 2, { category: 'Business' }),
      sample('event', 'music-late', 30, { category: 'Music' }),
      sample('event', 'music-soon', 4, { category: 'Music' }),
    ];
    expect(api.similar(shown, 3, pool).map((l) => l.id)).toEqual([
      'music-soon',
      'music-late',
      'other-cat',
    ]);
  });

  it('puts listings over a year out behind near ones', () => {
    const pool = [
      shown,
      sample('event', 'music-2028', 734, { category: 'Music' }),
      sample('event', 'business-soon', 6, { category: 'Business' }),
    ];
    expect(api.similar(shown, 3, pool).map((l) => l.id)).toEqual([
      'business-soon',
      'music-2028',
    ]);
  });
});

describe('forYou', () => {
  it('keeps only picked categories, soonest first, alternating kinds', () => {
    const pool = [
      sample('event', 'music-late', 9, { category: 'Music' }),
      sample('event', 'film', 1, { category: 'Film' }),
      sample('opportunity', 'grant', 3, { category: 'Grants' }),
      sample('event', 'music-soon', 2, { category: 'Music' }),
      sample('opportunity', 'job', 1, { category: 'Jobs' }),
    ];
    expect(api.forYou(['Music', 'Grants'], pool).map((l) => l.id)).toEqual([
      'music-soon',
      'grant',
      'music-late',
    ]);
  });

  it('is empty without interests', () => {
    expect(api.forYou([])).toEqual([]);
  });
});
