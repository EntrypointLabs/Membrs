import { useCallback, useSyncExternalStore } from 'react';
import type { ContributeKind, LegalSlug } from './types';

/**
 * A dependency-free history router, the same shape as the merchant portal's.
 * membrs has a couple of dozen pages and no nested layouts, so a router
 * library would be more bundle than the job needs; the URL stays the single
 * source of truth so refresh, deep links and back/forward all land right.
 */

// Back/forward fire "popstate"; navigate() fires "locationchange".
function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener('locationchange', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('locationchange', callback);
  };
}

function snapshot(): string {
  return window.location.pathname + window.location.search;
}

export function useLocation(): string {
  return useSyncExternalStore(subscribe, snapshot, () => '/');
}

/** Push a new path without a full reload, then let subscribers re-read it. */
export function navigate(to: string, { replace = false } = {}): void {
  if (to === snapshot()) return;
  if (replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event('locationchange'));
  if (!replace) window.scrollTo({ top: 0 });
}

export function useNavigate() {
  return useCallback(
    (to: string, options?: { replace?: boolean }) => navigate(to, options),
    [],
  );
}

export type FeedKind = 'events' | 'opportunities' | 'places' | 'promos';

export type Route =
  | { page: 'home' }
  | { page: 'feed'; feed: FeedKind }
  | { page: 'categories'; feed: FeedKind }
  | { page: 'category'; slug: string }
  | { page: 'listing'; id: string }
  | { page: 'place'; id: string }
  | { page: 'promo'; id: string }
  | { page: 'digest' }
  | { page: 'issue'; id: string }
  | { page: 'contribute'; kind: ContributeKind }
  | { page: 'search'; query: string }
  | { page: 'legal'; doc: LegalSlug }
  | { page: 'not-found' };

const FEEDS: readonly FeedKind[] = [
  'events',
  'opportunities',
  'places',
  'promos',
];
const LEGAL: readonly LegalSlug[] = [
  'terms',
  'privacy',
  'cookies',
  'guidelines',
  'advertising',
];
const CONTRIBUTE: readonly ContributeKind[] = [
  'event',
  'opportunity',
  'place',
  'promo',
  'ad',
];

function isOneOf<T extends string>(
  list: readonly T[],
  value: string,
): value is T {
  return (list as readonly string[]).includes(value);
}

/** Read a path and query into a Route. Unknown paths are not-found, never a throw. */
export function parseRoute(location: string): Route {
  const [rawPath = '/', search = ''] = location.split('?');
  const params = new URLSearchParams(search);
  const parts = rawPath.split('/').filter(Boolean).map(decodeURIComponent);
  const [first = '', second] = parts;

  if (parts.length === 0) return { page: 'home' };
  if (isOneOf(FEEDS, first)) {
    if (!second) return { page: 'feed', feed: first };
    if (second === 'categories' && parts.length === 2) {
      return { page: 'categories', feed: first };
    }
  }
  if (parts.length === 2 && second) {
    if (first === 'category') return { page: 'category', slug: second };
    if (first === 'listing') return { page: 'listing', id: second };
    if (first === 'place') return { page: 'place', id: second };
    if (first === 'promo') return { page: 'promo', id: second };
    if (first === 'digest') return { page: 'issue', id: second };
  }
  if (parts.length === 1) {
    if (first === 'digest') return { page: 'digest' };
    if (first === 'search')
      return { page: 'search', query: params.get('q') ?? '' };
    if (first === 'contribute') {
      const kind = params.get('kind') ?? 'event';
      return {
        page: 'contribute',
        kind: isOneOf(CONTRIBUTE, kind) ? kind : 'event',
      };
    }
    if (isOneOf(LEGAL, first)) return { page: 'legal', doc: first };
  }
  return { page: 'not-found' };
}

/** One query parameter of the current URL, re-read on every navigation. */
export function useSearchParam(name: string): string | null {
  const location = useLocation();
  return new URLSearchParams(location.split('?')[1] ?? '').get(name);
}

/** Set or clear query parameters, keeping the path and the rest. */
export function setSearchParams(next: Record<string, string | null>): void {
  const params = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(next)) {
    if (v === null || v === '' || v === 'all') params.delete(k);
    else params.set(k, v);
  }
  const query = params.toString();
  navigate(window.location.pathname + (query ? `?${query}` : ''), {
    replace: true,
  });
}

export function useRoute(): Route {
  return parseRoute(useLocation());
}

/** Which top-level nav item a route belongs to, for the active state. */
export function navSection(
  route: Route,
): FeedKind | 'home' | 'digest' | 'contribute' | null {
  switch (route.page) {
    case 'home':
      return 'home';
    case 'feed':
    case 'categories':
      return route.feed;
    case 'listing':
      return null;
    case 'place':
      return 'places';
    case 'promo':
      return 'promos';
    case 'digest':
    case 'issue':
      return 'digest';
    case 'contribute':
      return 'contribute';
    default:
      return null;
  }
}

/* Path builders, so no screen spells a URL by hand. */
export const paths = {
  home: () => '/',
  feed: (feed: FeedKind) => `/${feed}`,
  categories: (feed: FeedKind) => `/${feed}/categories`,
  category: (slug: string) => `/category/${slug}`,
  listing: (id: string) => `/listing/${id}`,
  place: (id: string) => `/place/${id}`,
  promo: (id: string) => `/promo/${id}`,
  digest: () => '/digest',
  issue: (id: string) => `/digest/${id}`,
  contribute: (kind: ContributeKind = 'event') =>
    kind === 'event' ? '/contribute' : `/contribute?kind=${kind}`,
  search: (query = '') =>
    query ? `/search?q=${encodeURIComponent(query)}` : '/search',
  legal: (doc: LegalSlug) => `/${doc}`,
};
