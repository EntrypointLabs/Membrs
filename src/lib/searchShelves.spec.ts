import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recentSearches, rememberSearch, searchShelves } from './searchShelves';

describe('recent searches', () => {
  beforeEach(() => recentSearches.set([]));

  it('never keeps a query carrying markup', () => {
    rememberSearch('<img src=x onerror="window.__xss=1">');
    expect(recentSearches.get()).toEqual([]);
  });

  it('leaves out a markup query already stored', () => {
    const shelves = searchShelves(['<b>x</b>', 'lagos']);
    const recent = shelves.find((s) =>
      s.tiles.some((t) => t.key.startsWith('recent:')),
    );
    expect(recent?.tiles.map((t) => t.key)).toEqual(['recent:lagos']);
  });

  it('keeps the newest first and folds repeats regardless of case', () => {
    rememberSearch('Lagos');
    rememberSearch('tech');
    rememberSearch('lagos');
    expect(recentSearches.get()).toEqual(['lagos', 'tech']);
  });

  it('ignores blank searches and keeps at most eight', () => {
    rememberSearch('   ');
    for (let i = 0; i < 12; i++) rememberSearch(`q${i}`);
    expect(recentSearches.get()).toHaveLength(8);
    expect(recentSearches.get()[0]).toBe('q11');
  });
});

describe('search shelves', () => {
  it('leaves out every shelf that has nothing live to show', () => {
    const shelves = searchShelves([]);
    expect(shelves.every((s) => s.tiles.length > 0)).toBe(true);
    expect(shelves.find((s) => s.title === 'Recent searches')).toBeUndefined();
  });

  it('shows recent searches as tiles that run the search again', () => {
    const recent = searchShelves(['jazz']).find(
      (s) => s.title === 'Recent searches',
    );
    expect(recent?.tiles[0]).toMatchObject({
      label: 'jazz',
      href: '/search?q=jazz',
    });
  });
});

describe('hidden sections', () => {
  it('leaves out the places and promos shelves while those sections are hidden', async () => {
    vi.resetModules();
    vi.doMock('./api', async (actual) => ({
      ...(await actual<typeof import('./api')>()),
      places: () => [{ id: 'p', type: 'Parks & gardens', photo: 'p1' }],
      promos: () => [{ id: 'd', category: 'Food', photo: 'p1' }],
    }));
    const { searchShelves: shelves } = await import('./searchShelves');
    const titles = shelves([]).map((s) => s.title);
    expect(titles).not.toContain('Places to go');
    expect(titles).not.toContain('Deals and promos');
    vi.doUnmock('./api');
  });
});
