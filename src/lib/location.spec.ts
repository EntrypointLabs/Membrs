import { describe, expect, it } from 'vitest';
import { catalogueCities, countryOfCity, nearbyPlaceOf } from './location';
import { eventListing, opportunityListing } from './testing';

const POOL = [
  eventListing({ id: 'a', city: 'Nairobi', country: 'KE' }),
  eventListing({ id: 'b', city: 'Nairobi', country: 'KE' }),
  opportunityListing({ id: 'c', city: 'Accra', country: 'GH' }),
];

describe('location', () => {
  it('lists each city in the catalogue once', () => {
    expect(catalogueCities(POOL)).toEqual(['Nairobi', 'Accra']);
  });

  it('reads a city country from its listings', () => {
    expect(countryOfCity('Nairobi', POOL)).toBe('KE');
    expect(countryOfCity('Lisbon', POOL)).toBe('');
  });

  it('places a reader in the nearest city the catalogue has', () => {
    expect(nearbyPlaceOf([-1.28, 36.81], POOL)).toMatchObject({
      city: 'Nairobi',
      country: 'KE',
    });
    expect(nearbyPlaceOf([-1.28, 36.81], POOL)?.around).toContain('Nairobi');
    expect(nearbyPlaceOf([51.5, -0.12], POOL)).toBeNull();
  });
});
