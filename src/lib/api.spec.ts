import { describe, expect, it } from 'vitest';
import {
  categories,
  closingSoon,
  feed,
  listings,
  mostPopular,
  places,
  promos,
  similar,
} from './api';

describe('fixtures', () => {
  it('give every listing a photo and a kind', () => {
    for (const l of listings()) {
      expect(l.photo).toMatch(/^[pq]\d+$/);
      expect(['event', 'opportunity']).toContain(l.kind);
    }
  });

  it('give every place seven days of hours', () => {
    for (const p of places()) expect(p.hours).toHaveLength(7);
  });

  it('carry promos and categories', () => {
    expect(promos().length).toBeGreaterThan(0);
    expect(categories().length).toBeGreaterThan(0);
  });
});

describe('feeds', () => {
  it('filters by kind', () => {
    expect(feed('event').every((l) => l.kind === 'event')).toBe(true);
  });

  it('sorts closing soon by nearest deadline', () => {
    const days = closingSoon().map((l) =>
      l.kind === 'opportunity' ? l.daysLeft : -1,
    );
    expect(days).toEqual([...days].sort((a, b) => a - b));
  });

  it('keeps Most Popular clear of what the carousel already shows', () => {
    const first = mostPopular(1)[0]!;
    expect(mostPopular(7, new Set([first.id])).map((l) => l.id)).not.toContain(
      first.id,
    );
  });

  it('never suggests the listing you are on', () => {
    const l = listings()[0]!;
    expect(similar(l).map((s) => s.id)).not.toContain(l.id);
  });
});
