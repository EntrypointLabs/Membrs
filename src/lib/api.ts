import { API_BASE } from './config';
import { bySoonest } from './dates';
import type {
  Category,
  ContributeForm,
  ContributeKind,
  LaunchCity,
  LegalDocument,
  LegalSlug,
  Listing,
  Place,
  Promo,
  Taxonomy,
} from './types';
import listingsFixture from '../fixtures/listings.json';
import placesFixture from '../fixtures/places.json';
import promosFixture from '../fixtures/promos.json';
import categoriesFixture from '../fixtures/categories.json';
import formsFixture from '../fixtures/contribute-forms.json';
import taxonomyFixture from '../fixtures/taxonomy.json';
import citiesFixture from '../fixtures/cities.json';
import metaFixture from '../fixtures/meta.json';

/**
 * Every read the app makes goes through here. Today the data is the bundled
 * fixtures; with VITE_API_BASE set, the same functions fetch the same shapes
 * from the API, so no screen changes when the backend lands.
 *
 * The fixtures are cast once, at this boundary, rather than validated: they
 * are generated from the prototype and checked by api.spec.ts.
 */
const fixtures = {
  listings: listingsFixture as Listing[],
  places: placesFixture as Place[],
  promos: promosFixture as Promo[],
  categories: categoriesFixture as Category[],
  forms: formsFixture as Record<ContributeKind, ContributeForm>,
  taxonomy: taxonomyFixture as Taxonomy,
  cities: citiesFixture as {
    launch: LaunchCity[];
    africa: string[];
    placeCities: string[];
  },
  meta: metaFixture as {
    today: string;
    searchSuggestions: string[];
    socials: { name: string; url: string }[];
  },
};

export class MembrsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MembrsApiError';
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new MembrsApiError(res.status, `GET ${path} failed`);
  return (await res.json()) as T;
}

/* Synchronous reads, for data that ships with the bundle either way. */

export function listings(): Listing[] {
  return fixtures.listings;
}

export function places(): Place[] {
  return fixtures.places;
}

export function promos(): Promo[] {
  return fixtures.promos;
}

export function categories(): Category[] {
  return fixtures.categories;
}

let legal: Promise<Record<LegalSlug, LegalDocument>> | undefined;

/**
 * The legal text is the largest fixture and almost nobody reads it, so it
 * loads on demand in its own chunk. The promise is cached so React's `use()`
 * sees the same one on every render.
 */
export function legalDocuments(): Promise<Record<LegalSlug, LegalDocument>> {
  return (legal ??= import('../fixtures/legal.json').then(
    (m) => m.default as Record<LegalSlug, LegalDocument>,
  ));
}

export function contributeForm(kind: ContributeKind): ContributeForm {
  return fixtures.forms[kind];
}

export function taxonomy(): Taxonomy {
  return fixtures.taxonomy;
}

export function launchCities(): LaunchCity[] {
  return fixtures.cities.launch;
}

export function africanCities(): string[] {
  return fixtures.cities.africa;
}

export function searchSuggestions(): string[] {
  return fixtures.meta.searchSuggestions;
}

/* Lookups. */

export function listingById(id: string): Listing | undefined {
  return fixtures.listings.find((l) => l.id === id);
}

export function placeById(id: string): Place | undefined {
  return fixtures.places.find((p) => p.id === id);
}

export function promoById(id: string): Promo | undefined {
  return fixtures.promos.find((p) => p.id === id);
}

export function categoryBySlug(slug: string): Category | undefined {
  return fixtures.categories.find((c) => c.slug === slug);
}

/* Derived collections the screens share. */

/** Feed order: listed first wins, ties go to whatever happens soonest. */
export function feed(kind: Listing['kind'] | 'all' = 'all'): Listing[] {
  return fixtures.listings
    .filter((l) => kind === 'all' || l.kind === kind)
    .sort((a, b) => a.listedRank - b.listedRank || bySoonest(a, b));
}

/** What happens or closes in the next `days`, soonest first. */
export function within(
  days: number,
  kind: Listing['kind'] | 'all' = 'all',
): Listing[] {
  return fixtures.listings
    .filter((l) => kind === 'all' || l.kind === kind)
    .filter((l) => (l.kind === 'event' ? l.inDays : l.daysLeft) <= days)
    .sort(bySoonest);
}

/** Open opportunities closing within `days`, nearest deadline first. */
export function closingSoon(days = 30): Listing[] {
  return within(days, 'opportunity');
}

/** Trending listings, used for the home page's Most Popular panel. */
export function mostPopular(
  limit: number,
  skip: ReadonlySet<string> = new Set(),
): Listing[] {
  return fixtures.listings
    .filter((l) => l.trending && !skip.has(l.id))
    .sort(bySoonest)
    .slice(0, limit);
}

/** Listings in the same category, then the same kind, excluding the one shown. */
export function similar(listing: Listing, limit = 3): Listing[] {
  const others = fixtures.listings.filter((l) => l.id !== listing.id);
  const same = others.filter((l) => l.category === listing.category);
  const kin = others.filter(
    (l) => l.kind === listing.kind && l.category !== listing.category,
  );
  return [...same, ...kin].slice(0, limit);
}

export function listingsInCategory(name: string): Listing[] {
  return fixtures.listings.filter((l) => l.category === name).sort(bySoonest);
}

/* Remote variants, for when VITE_API_BASE points at a backend. */

export async function fetchListings(): Promise<Listing[]> {
  return API_BASE ? getJson<Listing[]>('/v1/listings') : fixtures.listings;
}

export interface DigestSignup {
  email: string;
  city: string;
  interests: string[];
}

/**
 * Subscribe to the Sunday digest. Without a backend the signup is accepted
 * locally, which is what the lite rollout does while the list lives in a
 * spreadsheet.
 */
export async function subscribe(signup: DigestSignup): Promise<void> {
  if (!API_BASE) return;
  const res = await fetch(`${API_BASE}/v1/digest/subscribers`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(signup),
  });
  if (!res.ok) throw new MembrsApiError(res.status, 'Subscribe failed');
}

/** Send a contribution (listing, place, promo or ad request) for review. */
export async function submitContribution(
  kind: ContributeKind,
  values: Record<string, string>,
): Promise<void> {
  if (!API_BASE) return;
  const res = await fetch(`${API_BASE}/v1/contributions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, values }),
  });
  if (!res.ok) throw new MembrsApiError(res.status, 'Submission failed');
}
