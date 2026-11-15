const LIVE_CITY_COORDINATES: Record<string, [number, number]> = {
  Lagos: [6.5244, 3.3792],
  Abuja: [9.0765, 7.3986],
  Accra: [5.6037, -0.187],
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
    const spot = LIVE_CITY_COORDINATES[city];
    if (!spot) continue;
    const km = distanceKm(at, spot);
    if (!best || km < best.km) best = { city, km };
  }
  return best && best.km <= NEAR_ENOUGH_KM ? best.city : null;
}

export async function grantedPosition(): Promise<[number, number] | null> {
  if (!navigator.permissions?.query || !navigator.geolocation) return null;
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    if (status.state !== 'granted') return null;
    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        maximumAge: 30 * 60_000,
        timeout: 10_000,
      }),
    );
    return [position.coords.latitude, position.coords.longitude];
  } catch {
    return null;
  }
}
