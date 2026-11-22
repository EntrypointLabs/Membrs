import { describe, expect, it } from 'vitest';
import {
  AFRICAN_COUNTRIES,
  matchingCountries,
  placeLabel,
  readerPlaceOf,
} from './africa';

describe('africa', () => {
  it('covers every African country with its states', () => {
    expect(AFRICAN_COUNTRIES.length).toBeGreaterThanOrEqual(54);
    const nigeria = AFRICAN_COUNTRIES.find((c) => c.code === 'NG');
    expect(nigeria?.states).toHaveLength(37);
    expect(nigeria?.states).toContain('Lagos');
  });

  it('reads a label back into the state and country it names', () => {
    expect(readerPlaceOf('Oyo, Nigeria')).toEqual({
      country: 'NG',
      state: 'Oyo',
    });
    expect(readerPlaceOf('Ghana')).toEqual({ country: 'GH', state: '' });
    expect(readerPlaceOf('Lagos', 'NG')).toEqual({
      country: 'NG',
      state: 'Lagos',
    });
    expect(readerPlaceOf('Ogun State', 'NG')).toEqual({
      country: 'NG',
      state: 'Ogun',
    });
    expect(readerPlaceOf('Nowhere')).toEqual({ country: '', state: '' });
  });

  it('labels a place the way the digest stores it', () => {
    expect(placeLabel({ country: 'NG', state: 'Lagos' })).toBe(
      'Lagos, Nigeria',
    );
    expect(placeLabel({ country: 'KE', state: '' })).toBe('Kenya');
  });

  it('searches countries by name', () => {
    expect(matchingCountries('nige').map((c) => c.code)).toEqual(['NE', 'NG']);
  });
});
