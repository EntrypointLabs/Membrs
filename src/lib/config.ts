import type { RemoteInterestPick } from './remote';

/**
 * Base URL for the membrs API. Every listing, place and promo comes from it;
 * with it empty the app shows no listings rather than sample data.
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export const API_TIMEOUT_MS = 5000;

/**
 * The whole catalogue is one response of a few megabytes, and the timeout
 * covers downloading it too, so a phone on a slow network needs far longer
 * than a small request does.
 */
export const CATALOGUE_TIMEOUT_MS = 30000;

export const ADS_CHECKOUT = import.meta.env.VITE_ADS_CHECKOUT === 'true';

/** Where the digest and contact emails go. */
export const CONTACT = {
  hello: 'hello@membrs.xyz',
  privacy: 'privacy@membrs.xyz',
  report: 'report@membrs.xyz',
  ads: 'ads@membrs.xyz',
} as const;

/** Cards per row on web, wherever cards sit in a grid. */
export const GRID_COLUMNS = 4;

/** How many listings a feed shows per page: three full rows of cards. */
export const PAGE_SIZE = GRID_COLUMNS * 3;

export const POPULAR_SIZE = PAGE_SIZE * 3;

export const MAX_PICKS_PER_KIND = 4;
export const CAPPED_KINDS: readonly RemoteInterestPick['kind'][] = [
  'event',
  'opportunity',
];

/** Where a reader is assumed to be until they share a location or pick a city. */
export const DEFAULT_CITY = 'Lagos';
export const DEFAULT_COUNTRY = 'NG';

/** How recently a listing must have been added to show under Just Added. */
export const JUST_ADDED_DAYS = 7;
