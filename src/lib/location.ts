import { chooseReaderPlace, listings, readerCountryStore } from './api';
import {
  citiesWithin,
  grantedPosition,
  locationRevoked,
  nearestCity,
  requestedPosition,
  type Position,
} from './geo';
import { cityStore } from './preferences';
import { createStore } from './store';
import { toast } from './ui';
import type { Listing } from './types';

export type LocationChoice = 'unasked' | 'dismissed' | 'granted';

export interface NearbyPlace {
  city: string;
  country: string;
  around: string[];
}

export const AROUND_KM = 150;

export const locationChoiceStore = createStore<LocationChoice>(
  'membrs.location',
  'unasked',
);

export const nearbyStore = createStore<NearbyPlace | null>(null, null);

/** The reader's own position, kept for this visit only and never saved. */
export const positionStore = createStore<Position | null>(null, null);

export function catalogueCities(pool: Listing[]): string[] {
  return [...new Set(pool.map((l) => l.city.trim()).filter(Boolean))];
}

export function countryOfCity(city: string, pool: Listing[]): string {
  const counts = new Map<string, number>();
  for (const l of pool) {
    if (l.city === city && l.country)
      counts.set(l.country, (counts.get(l.country) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

export function nearbyPlaceOf(
  at: Position,
  pool: Listing[],
): NearbyPlace | null {
  const cities = catalogueCities(pool);
  const city = nearestCity(at, cities);
  if (!city) return null;
  return {
    city,
    country: countryOfCity(city, pool),
    around: citiesWithin(at, cities, AROUND_KM),
  };
}

function settle(at: Position | null): NearbyPlace | null {
  const place = at ? nearbyPlaceOf(at, listings()) : null;
  positionStore.set(place ? at : null);
  if (place) {
    nearbyStore.set(place);
    cityStore.set(place.city);
    readerCountryStore.set(place.country);
  }
  return place;
}

export function chooseCity(city: string): void {
  if (chooseReaderPlace(city)) return;
  cityStore.set(city);
  const country = countryOfCity(city, listings());
  if (country) readerCountryStore.set(country);
}

const LOCATION_REFUSED =
  'Location is off for membrs. Allow it in your browser settings, then try again.';
const LOCATION_UNAVAILABLE =
  'We could not find your location. Try again in a moment.';

export async function shareLocation(): Promise<NearbyPlace | null> {
  const { at, refused } = await requestedPosition();
  locationChoiceStore.set(at ? 'granted' : 'dismissed');
  if (!at) toast(refused ? LOCATION_REFUSED : LOCATION_UNAVAILABLE);
  return settle(at);
}

export async function readGrantedLocation(): Promise<NearbyPlace | null> {
  const at = await grantedPosition();
  if (at) locationChoiceStore.set('granted');
  else if (locationChoiceStore.get() === 'granted' && (await locationRevoked()))
    forgetLocation();
  return settle(at);
}

function forgetLocation(): void {
  locationChoiceStore.set('unasked');
  nearbyStore.set(null);
  positionStore.set(null);
  readerCountryStore.reset();
}
