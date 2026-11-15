import { describe, expect, it } from 'vitest';
import listingsFixture from '../fixtures/listings.json';
import placesFixture from '../fixtures/places.json';
import promosFixture from '../fixtures/promos.json';
import { search } from './search';
import type { Listing, Place, Promo } from './types';

const data = {
  listings: listingsFixture as Listing[],
  places: placesFixture as Place[],
  promos: promosFixture as Promo[],
};

describe('search', () => {
  it('finds a listing by title', () => {
    const [top] = search('devfest', data);
    expect(top?.kind).toBe('listing');
    expect(top && 'title' in top.item ? top.item.title : '').toMatch(/DevFest/);
  });

  it('needs every word to match', () => {
    expect(search('opera zzzz', data)).toHaveLength(0);
  });

  it('searches places and promos too', () => {
    expect(search('beach', data).some((h) => h.kind === 'place')).toBe(true);
    expect(search('black friday', data).some((h) => h.kind === 'promo')).toBe(
      true,
    );
  });

  it('returns nothing for an empty query', () => {
    expect(search('  ', data)).toEqual([]);
  });
});
