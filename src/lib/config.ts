/**
 * Base URL for the membrs API. Every listing, place and promo comes from it;
 * with it empty the app shows no listings rather than sample data.
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export const API_TIMEOUT_MS = 5000;

export const ADS_CHECKOUT = import.meta.env.VITE_ADS_CHECKOUT === 'true';

/** Where the digest and contact emails go. */
export const CONTACT = {
  hello: 'hello@membrs.app',
  privacy: 'privacy@membrs.app',
  report: 'report@membrs.app',
  ads: 'ads@membrs.app',
} as const;

/** How many listings a feed shows per page. */
export const PAGE_SIZE = 12;
