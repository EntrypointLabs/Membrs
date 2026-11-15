import { launchCities } from './api';

export function digestCities(saved = ''): string[] {
  const live = launchCities()
    .filter((c) => c.status === 'live')
    .map((c) => c.name);
  const city = saved.trim();
  return city && !live.includes(city) ? [...live, city] : live;
}
