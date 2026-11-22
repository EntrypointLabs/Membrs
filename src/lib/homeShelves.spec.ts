import { describe, expect, it } from 'vitest';
import { homeShelves, localShelves } from './homeShelves';
import { eventListing, opportunityListing } from './testing';
import type { Listing } from './types';

function events(prefix: string, count: number, over = {}): Listing[] {
  return Array.from({ length: count }, (_, i) =>
    eventListing({
      id: `${prefix}${i}`,
      title: `Event ${prefix}${i}`,
      inDays: 10,
      ...over,
    }),
  );
}

function opportunities(prefix: string, count: number, over = {}): Listing[] {
  return Array.from({ length: count }, (_, i) =>
    opportunityListing({
      id: `${prefix}${i}`,
      title: `Opportunity ${prefix}${i}`,
      daysLeft: 10,
      ...over,
    }),
  );
}

function shelvesOf(pool: Listing[], over = {}) {
  return homeShelves({
    pool,
    nearby: null,
    viewed: [],
    ...over,
  });
}

describe('homeShelves', () => {
  it('skips a shelf with fewer than four listings', () => {
    const titles = shelvesOf(events('m', 3)).map((s) => s.title);
    expect(titles).not.toContain('Concerts This Month');
  });

  it('never shows the same listing on two shelves', () => {
    const pool = [
      ...events('m', 8),
      ...events('t', 6, { category: 'Tech' }),
      ...opportunities('o', 6, { remote: true }),
    ];
    const ids = shelvesOf(pool).flatMap((s) => s.items.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('orders a shelf by popularity, highest first', () => {
    const pool = [10, 90, 40, 70].map((popularity, i) =>
      eventListing({ id: `m${i}`, title: `Show m${i}`, inDays: 5, popularity }),
    );
    const concerts = shelvesOf(pool).find((s) => s.id === 'concerts');
    expect(concerts?.items.map((l) => l.popularity)).toEqual([90, 70, 40, 10]);
  });

  it('leaves out events more than a month away and closed opportunities', () => {
    const pool = [
      ...events('far', 6, { inDays: 45 }),
      ...opportunities('shut', 6, { daysLeft: -1 }),
    ];
    expect(shelvesOf(pool)).toEqual([]);
  });

  it('shows remote and online shelves without a location', () => {
    const pool = [
      ...opportunities('r', 4, { remote: true }),
      ...events('v', 4, { mode: 'Remote', category: 'Tech' }),
    ];
    const ids = shelvesOf(pool).map((s) => s.id);
    expect(ids).toContain('remote');
    expect(ids).toContain('online');
  });

  it('opens with what is near the reader, then the rest of their country', () => {
    const pool = [
      ...events('acc', 4, { city: 'Accra', country: 'GH' }),
      ...opportunities('gh', 4, {
        city: 'Kumasi',
        country: 'GH',
        remote: false,
        mode: 'In person',
      }),
      ...events('far', 4, { city: 'Nairobi', country: 'KE' }),
    ];
    const [near, country] = localShelves({
      pool,
      nearby: { city: 'Accra', country: 'GH', around: ['Accra'] },
      viewed: [],
    });
    expect(near?.title).toBe('Near You');
    expect(near?.items.every((l) => l.city === 'Accra')).toBe(true);
    expect(country?.title).toBe('In Ghana');
    expect(country?.items.map((l) => l.city)).toEqual(Array(4).fill('Kumasi'));
  });

  it('orders Near You nearest first once the reader shares a position', () => {
    const pool = [
      ...events('far', 2, { city: 'Accra', country: 'GH' }),
      ...events('venue', 2, {
        city: 'Accra',
        country: 'GH',
        venueAt: { lat: 5.65, lng: -0.18 },
      }),
    ];
    const [near] = localShelves({
      pool,
      nearby: { city: 'Accra', country: 'GH', around: ['Accra'] },
      position: [5.65, -0.18],
      viewed: [],
    });
    expect(near?.items[0]?.id).toMatch(/^venue/);
    expect(near?.distances?.get(near.items[0]?.id ?? '')).toBeCloseTo(0, 1);
  });

  it("shows no city shelves without the reader's location", () => {
    const pool = events('acc', 6, { city: 'Accra', country: 'GH' });
    expect(shelvesOf(pool).map((s) => s.title)).not.toContain('Near You');
  });

  it('ranks a picked place by state, then country, then online', () => {
    const pool = [
      ...events('online', 2, { mode: 'Remote', country: '' }),
      ...events('kano', 2, { country: 'NG', state: 'Kano', city: 'Kano' }),
      ...events('ibadan', 2, { country: 'NG', state: 'Oyo', city: 'Ibadan' }),
      ...events('accra', 2, { country: 'GH', state: 'Greater Accra' }),
    ];
    const near = localShelves({
      pool,
      nearby: null,
      picked: { country: 'NG', state: 'Oyo' },
      viewed: [],
    }).find((s) => s.id === 'nearby');
    expect(near?.about).toBe('Oyo');
    expect(near?.items.map((l) => l.id)).toEqual([
      'ibadan0',
      'ibadan1',
      'kano0',
      'kano1',
      'online0',
      'online1',
    ]);
  });

  it('builds a shelf from a listing the reader viewed', () => {
    const viewed = eventListing({ id: 'seen', inDays: 2, category: 'Food' });
    const pool = [viewed, ...events('f', 5, { category: 'Food' })];
    const shelf = shelvesOf(pool, { viewed: ['seen'] })[0];
    expect(shelf?.title).toBe('Because You Viewed');
    expect(shelf?.items.map((l) => l.id)).not.toContain('seen');
  });

  it('builds the viewed shelf from the most recent view only', () => {
    const older = eventListing({ id: 'older', inDays: 2, category: 'Food' });
    const latest = eventListing({ id: 'latest', inDays: 3, category: 'Tech' });
    const pool = [
      older,
      latest,
      ...events('f', 5, { category: 'Food' }),
      ...events('t', 5, { category: 'Tech' }),
    ];
    const viewed = shelvesOf(pool, { viewed: ['latest', 'older'] }).filter(
      (s) => s.title === 'Because You Viewed',
    );
    expect(viewed.map((s) => s.about)).toEqual([latest.title]);
  });

  it('reuses the last shelves while the inputs hold the same listings', () => {
    const pool = opportunities('r', 8, { remote: true });
    const first = shelvesOf(pool);
    expect(shelvesOf([...pool])).toBe(first);
    const grown = [...pool, ...opportunities('s', 8, { remote: true })];
    expect(shelvesOf(grown)).not.toBe(first);
    expect(shelvesOf(grown)[0]?.items).toHaveLength(16);
  });
});
