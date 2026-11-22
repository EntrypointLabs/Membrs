import type { Listing } from './types';

const CITY_COORDINATES: Record<string, [number, number]> = {
  Lagos: [6.5244, 3.3792],
  Abuja: [9.0765, 7.3986],
  'Port Harcourt': [4.8156, 7.0498],
  Ibadan: [7.3775, 3.947],
  Kano: [12.0022, 8.592],
  Enugu: [6.4584, 7.5464],
  'Benin City': [6.335, 5.6037],
  Kaduna: [10.5105, 7.4165],
  Abeokuta: [7.1475, 3.3619],
  Calabar: [4.9757, 8.3417],
  Uyo: [5.0377, 7.9128],
  Owerri: [5.485, 7.0355],
  Jos: [9.8965, 8.8583],
  Ilorin: [8.4966, 4.5421],
  Accra: [5.6037, -0.187],
  Kumasi: [6.6885, -1.6244],
  Tamale: [9.4008, -0.8393],
  'Cape Coast': [5.1053, -1.2466],
  Nairobi: [-1.2921, 36.8219],
  Mombasa: [-4.0435, 39.6682],
  Kisumu: [-0.0917, 34.768],
  Kampala: [0.3476, 32.5825],
  Kigali: [-1.9441, 30.0619],
  'Dar es Salaam': [-6.7924, 39.2083],
  Arusha: [-3.3869, 36.683],
  Zanzibar: [-6.1659, 39.2026],
  'Addis Ababa': [9.03, 38.74],
  Johannesburg: [-26.2041, 28.0473],
  'Cape Town': [-33.9249, 18.4241],
  Durban: [-29.8587, 31.0218],
  Pretoria: [-25.7479, 28.2293],
  Gqeberha: [-33.9608, 25.6022],
  Bloemfontein: [-29.0852, 26.1596],
  Gaborone: [-24.6282, 25.9231],
  Maseru: [-29.3151, 27.4869],
  Windhoek: [-22.5609, 17.0658],
  Harare: [-17.8252, 31.0335],
  Lusaka: [-15.3875, 28.3228],
  Lilongwe: [-13.9626, 33.7741],
  Blantyre: [-15.7861, 35.0058],
  Maputo: [-25.9692, 32.5732],
  Antananarivo: [-18.8792, 47.5079],
  'Port Louis': [-20.1609, 57.5012],
  Kinshasa: [-4.4419, 15.2663],
  Libreville: [0.4162, 9.4673],
  Douala: [4.0511, 9.7679],
  Yaounde: [3.848, 11.5021],
  Cairo: [30.0444, 31.2357],
  Alexandria: [31.2001, 29.9187],
  Casablanca: [33.5731, -7.5898],
  Rabat: [34.0209, -6.8416],
  Marrakech: [31.6295, -7.9811],
  Tunis: [36.8065, 10.1815],
  Algiers: [36.7538, 3.0588],
  Dakar: [14.7167, -17.4677],
  Abidjan: [5.36, -4.0083],
  Bamako: [12.6392, -8.0029],
  Ouagadougou: [12.3714, -1.5197],
  Lome: [6.1256, 1.2254],
  Cotonou: [6.3703, 2.3912],
  Freetown: [8.4657, -13.2317],
  Monrovia: [6.3156, -10.8074],
  Dubai: [25.2048, 55.2708],
  'Abu Dhabi': [24.4539, 54.3773],
  London: [51.5074, -0.1278],
  Manchester: [53.4808, -2.2426],
  Lisbon: [38.7223, -9.1393],
  Paris: [48.8566, 2.3522],
  'New York': [40.7128, -74.006],
  Atlanta: [33.749, -84.388],
  Houston: [29.7604, -95.3698],
  'Los Angeles': [34.0522, -118.2437],
  Washington: [38.9072, -77.0369],
  Toronto: [43.6532, -79.3832],
  Mumbai: [19.076, 72.8777],
  'New Delhi': [28.6139, 77.209],
};

const EARTH_RADIUS_KM = 6371;
const NEAR_ENOUGH_KM = 250;

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceKm(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number],
): number {
  const a =
    Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function nearestCity(
  at: [number, number],
  cities: readonly string[],
): string | null {
  let best: { city: string; km: number } | null = null;
  for (const city of cities) {
    const spot = CITY_COORDINATES[city];
    if (!spot) continue;
    const km = distanceKm(at, spot);
    if (!best || km < best.km) best = { city, km };
  }
  return best && best.km <= NEAR_ENOUGH_KM ? best.city : null;
}

export function citiesWithin(
  at: [number, number],
  cities: readonly string[],
  km: number,
): string[] {
  return cities.filter((city) => {
    const spot = CITY_COORDINATES[city];
    return spot !== undefined && distanceKm(at, spot) <= km;
  });
}

export type Position = [number, number];

const POSITION_MAX_AGE_MS = 30 * 60_000;
const POSITION_TIMEOUT_MS = 10_000;

function currentPosition(): Promise<Position | null> {
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve([position.coords.latitude, position.coords.longitude]),
      () => resolve(null),
      { maximumAge: POSITION_MAX_AGE_MS, timeout: POSITION_TIMEOUT_MS },
    ),
  );
}

async function permissionState(): Promise<PermissionState | null> {
  if (!navigator.permissions?.query || !navigator.geolocation) return null;
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state;
  } catch {
    return null;
  }
}

export async function locationRevoked(): Promise<boolean> {
  const state = await permissionState();
  return state === 'denied' || state === 'prompt';
}

export async function grantedPosition(): Promise<Position | null> {
  if ((await permissionState()) !== 'granted') return null;
  try {
    return await currentPosition();
  } catch {
    return null;
  }
}

export async function requestedPosition(): Promise<Position | null> {
  if (!navigator.geolocation) return null;
  try {
    return await currentPosition();
  } catch {
    return null;
  }
}

/** Where a listing happens: its venue when known, otherwise its city. */
export function spotOf(listing: Listing): Position | null {
  if (listing.kind === 'event' && listing.venueAt)
    return [listing.venueAt.lat, listing.venueAt.lng];
  return CITY_COORDINATES[listing.city.trim()] ?? null;
}

export interface Distanced {
  listing: Listing;
  km: number;
}

/** Listings within reach of the reader, nearest first. */
export function closestTo(
  at: Position,
  pool: Listing[],
  withinKm: number,
): Distanced[] {
  const near: Distanced[] = [];
  for (const listing of pool) {
    const spot = spotOf(listing);
    if (!spot) continue;
    const km = distanceKm(at, spot);
    if (km <= withinKm) near.push({ listing, km });
  }
  return near.sort((a, b) => a.km - b.km);
}
