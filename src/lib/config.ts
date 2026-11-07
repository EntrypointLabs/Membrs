/**
 * Base URL for the membrs API. Empty, the default, means the app reads the
 * bundled fixtures, which is how the lite rollout ships until a backend
 * exists. Set it and every function in ./api fetches from there instead.
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

/**
 * The day every relative label is measured from. The fixtures were captured
 * on this date, so "Tonight" and "4d left" stay true to them. A live API
 * replaces this with the real date.
 */
export const REFERENCE_DATE = '2026-11-05';

/** Where the digest and contact emails go. */
export const CONTACT = {
  hello: 'hello@membrs.app',
  privacy: 'privacy@membrs.app',
  report: 'report@membrs.app',
  ads: 'ads@membrs.app',
} as const;

/** How many listings a feed shows per page. */
export const PAGE_SIZE = 12;
