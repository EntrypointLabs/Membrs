import { describe, expect, it } from 'vitest';
import { countryOfCity, nearbyPlaceOf } from './location';

const CITIES = [
  { name: 'Nairobi', country: 'KE', count: 2, cover: '' },
  { name: 'Accra', country: 'GH', count: 1, cover: '' },
];

describe('location', () => {
  it('names the country the catalogue lists a city under', () => {
    expect(countryOfCity('Nairobi', CITIES)).toBe('KE');
    expect(countryOfCity('Lisbon', CITIES)).toBe('');
  });

  it('settles on the nearest catalogue city and the ones around it', () => {
    expect(nearbyPlaceOf([-1.28, 36.81], CITIES)).toMatchObject({
      city: 'Nairobi',
      country: 'KE',
    });
    expect(nearbyPlaceOf([-1.28, 36.81], CITIES)?.around).toContain('Nairobi');
    expect(nearbyPlaceOf([51.5, -0.12], CITIES)).toBeNull();
  });
});
