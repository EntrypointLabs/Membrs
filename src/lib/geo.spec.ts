import { describe, expect, it } from 'vitest';
import { distanceKm, nearestCity } from './geo';

const LIVE = ['Lagos', 'Abuja', 'Accra'];

describe('nearestCity', () => {
  it('maps a position in Ikeja to Lagos', () => {
    expect(nearestCity([6.6018, 3.3515], LIVE)).toBe('Lagos');
  });

  it('maps a position in Kumasi to Accra', () => {
    expect(nearestCity([6.6885, -1.6244], LIVE)).toBe('Accra');
  });

  it('maps a position in Garki to Abuja', () => {
    expect(nearestCity([9.0333, 7.4833], LIVE)).toBe('Abuja');
  });

  it('gives nothing when every live city is far away', () => {
    expect(nearestCity([51.5074, -0.1278], LIVE)).toBeNull();
  });

  it('only considers the cities it is given', () => {
    expect(nearestCity([6.6018, 3.3515], ['Accra'])).toBeNull();
  });

  it('measures distance on the globe', () => {
    expect(distanceKm([6.5244, 3.3792], [9.0765, 7.3986])).toBeCloseTo(524, -1);
  });
});
