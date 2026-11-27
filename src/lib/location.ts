import {
  catalogueSummary,
  chooseReaderPlace,
  loadSummary,
  readerCountryStore,
} from './api';
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
import type { CityCount } from './types';

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

function knownCities(): CityCount[] {
  return catalogueSummary()?.cities ?? [];
}

export function countryOfCity(city: string, cities: CityCount[]): string {
  return cities.find((c) => c.name === city)?.country ?? '';
}

export function nearbyPlaceOf(
  at: Position,
  known: CityCount[],
): NearbyPlace | null {
  const cities = known.map((c) => c.name);
  const city = nearestCity(at, cities);
  if (!city) return null;
  return {
    city,
    country: countryOfCity(city, known),
    around: citiesWithin(at, cities, AROUND_KM),
  };
}

async function citiesForNearby(): Promise<CityCount[]> {
  const known = knownCities();
  if (known.length) return known;
  return (await loadSummary().catch(() => null))?.cities ?? [];
}

async function settle(at: Position | null): Promise<NearbyPlace | null> {
  const place = at ? nearbyPlaceOf(at, await citiesForNearby()) : null;
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
  const country = countryOfCity(city, knownCities());
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
