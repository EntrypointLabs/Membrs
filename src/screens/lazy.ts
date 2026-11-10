import { lazy, type ComponentType } from 'react';

/**
 * Every screen except Home is its own chunk, so the first visit only pays for
 * the page it lands on. `preload` starts a chunk early: Link calls it on hover
 * and touch, so by the time the click lands the code is usually already here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

function lazyScreen<T, K extends keyof T>(load: () => Promise<T>, name: K) {
  let promise: Promise<T> | undefined;
  const preload = () => (promise ??= load());
  const Component = lazy(() =>
    preload().then((m) => ({ default: m[name] as unknown as AnyComponent })),
  );
  return Object.assign(Component, { preload }) as unknown as T[K] & {
    preload: () => Promise<T>;
  };
}

export const FeedScreen = lazyScreen(
  () => import('./FeedScreen'),
  'FeedScreen',
);
export const PlacesScreen = lazyScreen(
  () => import('./PlacesScreen'),
  'PlacesScreen',
);
export const PromosScreen = lazyScreen(
  () => import('./PromosScreen'),
  'PromosScreen',
);
export const CategoriesScreen = lazyScreen(
  () => import('./CategoriesScreen'),
  'CategoriesScreen',
);
export const CategoryScreen = lazyScreen(
  () => import('./CategoriesScreen'),
  'CategoryScreen',
);
export const ListingScreen = lazyScreen(
  () => import('./ListingScreen'),
  'ListingScreen',
);
export const PlaceScreen = lazyScreen(
  () => import('./PlaceScreen'),
  'PlaceScreen',
);
export const PromoScreen = lazyScreen(
  () => import('./PromoScreen'),
  'PromoScreen',
);
export const ContributeScreen = lazyScreen(
  () => import('./ContributeScreen'),
  'ContributeScreen',
);
export const SearchScreen = lazyScreen(
  () => import('./SearchScreen'),
  'SearchScreen',
);
export const LegalScreen = lazyScreen(
  () => import('./LegalScreen'),
  'LegalScreen',
);
export const NotFoundScreen = lazyScreen(
  () => import('./NotFoundScreen'),
  'NotFoundScreen',
);

/** Which chunk a path needs, for hover preloading. */
export function preloadPath(path: string): void {
  const first = path.split(/[/?]/)[1] ?? '';
  const table: Record<string, () => unknown> = {
    events: FeedScreen.preload,
    opportunities: FeedScreen.preload,
    places: PlacesScreen.preload,
    promos: PromosScreen.preload,
    category: CategoryScreen.preload,
    listing: ListingScreen.preload,
    place: PlaceScreen.preload,
    promo: PromoScreen.preload,
    contribute: ContributeScreen.preload,
    search: SearchScreen.preload,
    terms: LegalScreen.preload,
    privacy: LegalScreen.preload,
    cookies: LegalScreen.preload,
    guidelines: LegalScreen.preload,
    advertising: LegalScreen.preload,
  };
  table[first]?.();
}
