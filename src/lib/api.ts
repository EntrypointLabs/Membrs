import { API_BASE } from './config';
import { authorizedFetch, sessionStore } from './auth';
import { shown } from './sections';
import { bySoonest, soonness, stillOpen } from './dates';
import { createStore } from './store';
import { dataOf, getData, getJson, newIdempotencyKey } from './http';
import { outboxStore, writeAsReader, type Delivery } from './outbox';
import { search, type SearchHit } from './search';
import {
  cityStore,
  fieldsStore,
  interestsStore,
  subscriptionStore,
} from './preferences';
import { digestFields, fieldsFromDigest } from './followups';
import {
  withSourcePhoto,
  isPlace,
  placeOf,
  promoOf,
  type RemoteDeal,
  type RemoteEstablishment,
  type RemoteInterestPick,
  type RemoteNewsletter,
} from './remote';
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
import categoriesFixture from '../fixtures/categories.json';
import formsFixture from '../fixtures/contribute-forms.json';
import taxonomyFixture from '../fixtures/taxonomy.json';
import citiesFixture from '../fixtures/cities.json';
import metaFixture from '../fixtures/meta.json';

/**
 * Every read the app makes goes through here. Listings, places and promos
 * only ever come from the API, so nothing on screen is sample data. The
 * bundled files left are configuration: categories, forms, cities and copy.
 */
const fixtures = {
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

export { MembrsApiError } from './http';

let catalogue: Listing[] = [];
let placeList: Place[] = [];
let promoList: Promo[] = [];
let categoryList: Category[] = recount(fixtures.categories, [], []);

/* Synchronous reads, for data that ships with the bundle either way. */

export function listings(): Listing[] {
  return catalogue;
}

export function places(): Place[] {
  return placeList;
}

export function promos(): Promo[] {
  return promoList;
}

export function categories(): Category[] {
  return categoryList;
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

const contributeForms = new Map<ContributeKind, ContributeForm>();

export function contributeForm(kind: ContributeKind): ContributeForm {
  const cached = contributeForms.get(kind);
  if (cached) return cached;
  const form = fixtures.forms[kind];
  const visible = {
    ...form,
    fields: form.fields.map((f) =>
      f.options ? { ...f, options: f.options.filter(shown) } : f,
    ),
  };
  contributeForms.set(kind, visible);
  return visible;
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
  return catalogue.find((l) => l.id === id);
}

export function placeById(id: string): Place | undefined {
  return placeList.find((p) => p.id === id);
}

export function promoById(id: string): Promo | undefined {
  return promoList.find((p) => p.id === id);
}

export function categoryBySlug(slug: string): Category | undefined {
  return categoryList.find((c) => c.slug === slug);
}

/* Derived collections the screens share. */

/** Feed order: listed first wins, ties go to whatever happens soonest. */
export function feed(kind: Listing['kind'] | 'all' = 'all'): Listing[] {
  return catalogue
    .filter((l) => kind === 'all' || l.kind === kind)
    .sort((a, b) => a.listedRank - b.listedRank || bySoonest(a, b));
}

export function within(
  days: number,
  kind: Listing['kind'] | 'all' = 'all',
): Listing[] {
  if (kind === 'all') {
    return alternated(within(days, 'event'), within(days, 'opportunity'));
  }
  return catalogue
    .filter((l) => l.kind === kind)
    .filter((l) => (l.kind === 'event' ? l.inDays : l.daysLeft) <= days)
    .sort(bySoonest);
}

export function alternated<T>(first: T[], second: T[]): T[] {
  const mixed: T[] = [];
  for (let i = 0; i < Math.max(first.length, second.length); i++) {
    if (i < first.length) mixed.push(first[i] as T);
    if (i < second.length) mixed.push(second[i] as T);
  }
  return mixed;
}

/** Open opportunities closing within `days`, nearest deadline first. */
export function closingSoon(): Listing[] {
  return catalogue
    .filter((l) => l.kind === 'opportunity' && l.closingSoon)
    .sort(bySoonest);
}

/** Trending listings, used for the home page's Most Popular panel. */
export function mostPopular(
  limit: number,
  skip: ReadonlySet<string> = new Set(),
): Listing[] {
  const open = catalogue.filter((l) => !skip.has(l.id));
  const trending = open.filter((l) => l.trending).sort(bySoonest);
  const rest = open.filter((l) => !l.trending).sort(bySoonest);
  return [...trending, ...rest].slice(0, limit);
}

const HERO_HORIZON_DAYS = 60;
const FAR_OFF_DAYS = 365;

export function heroPicks(limit = 3, pool: Listing[] = catalogue): Listing[] {
  const events = pool.filter((l) => l.kind === 'event');
  const near = events
    .filter((l) => soonness(l) <= HERO_HORIZON_DAYS)
    .sort(
      (a, b) =>
        Number(b.trending) - Number(a.trending) ||
        bySoonest(a, b) ||
        a.listedRank - b.listedRank,
    );
  const later = events
    .filter((l) => soonness(l) > HERO_HORIZON_DAYS)
    .sort(bySoonest);
  return [...near, ...later].slice(0, limit);
}

export function similar(
  listing: Listing,
  limit = 3,
  pool: Listing[] = catalogue,
): Listing[] {
  const tier = (l: Listing) =>
    (soonness(l) > FAR_OFF_DAYS ? 2 : 0) +
    (l.category === listing.category ? 0 : 1);
  return pool
    .filter((l) => l.id !== listing.id && l.kind === listing.kind)
    .sort((a, b) => tier(a) - tier(b) || bySoonest(a, b))
    .slice(0, limit);
}

export function forYou(
  interests: readonly string[],
  pool: Listing[] = catalogue,
): Listing[] {
  const picked = new Set(interests);
  const matching = pool.filter((l) => picked.has(l.category)).sort(bySoonest);
  return alternated<Listing>(
    matching.filter((l) => l.kind === 'event'),
    matching.filter((l) => l.kind === 'opportunity'),
  );
}

export function inCity(
  city: string,
  kind: Listing['kind'] | 'all' = 'all',
): Listing[] {
  return catalogue
    .filter((l) => (kind === 'all' || l.kind === kind) && l.city === city)
    .sort(bySoonest);
}

export function listingsInCategory(name: string): Listing[] {
  return catalogue.filter((l) => l.category === name).sort(bySoonest);
}

/* Remote variants, for when VITE_API_BASE points at a backend. */

export async function fetchListings(): Promise<Listing[]> {
  return API_BASE ? getJson<Listing[]>('/v1/listings') : catalogue;
}

const SEARCH_LIMIT = 50;

const SEARCHABLE = (
  [
    ['events', (id: string) => listingHit(id)],
    ['opportunities', (id: string) => listingHit(id)],
    ['establishments', (id: string) => placeHit(id)],
    ['deals', (id: string) => promoHit(id)],
  ] as const
).filter(([path]) => shown(path));

function listingHit(id: string): Omit<SearchHit, 'score'> | undefined {
  const item = listingById(id);
  return item && { kind: 'listing', item };
}

function placeHit(id: string): Omit<SearchHit, 'score'> | undefined {
  const item = placeById(id);
  return item && { kind: 'place', item };
}

function promoHit(id: string): Omit<SearchHit, 'score'> | undefined {
  const item = promoById(id);
  return item && { kind: 'promo', item };
}

export function searchLocally(query: string): SearchHit[] {
  return search(query, {
    listings: catalogue,
    places: placeList,
    promos: promoList,
  }).filter((hit) => shown(hit.kind));
}

export async function searchCatalogue(query: string): Promise<SearchHit[]> {
  return (await searchCataloguePage(query, 0)).hits;
}

export async function searchCataloguePage(
  query: string,
  page: number,
): Promise<{ hits: SearchHit[]; more: boolean }> {
  const q = query.trim();
  if (!API_BASE || !q) return { hits: searchLocally(q), more: false };
  const params = new URLSearchParams({ q, limit: String(SEARCH_LIMIT) });
  if (page > 0) params.set('offset', String(page * SEARCH_LIMIT));
  try {
    const pages = await Promise.all(
      SEARCHABLE.map(([path]) =>
        getData<{ results: { id: string; score: number }[] }>(
          `/v1/${path}/search?${params}`,
        ),
      ),
    );
    const hits = pages
      .flatMap((page, i) =>
        page.results.flatMap(({ id, score }) => {
          const hit = SEARCHABLE[i]![1](id);
          return hit ? [{ ...hit, score } as SearchHit] : [];
        }),
      )
      .sort((a, b) => b.score - a.score);
    const more = pages.some((p) => p.results.length >= SEARCH_LIMIT);
    return { hits, more };
  } catch {
    return { hits: page > 0 ? [] : searchLocally(q), more: false };
  }
}

export interface DigestSignup {
  email: string;
  city: string;
  interests: string[];
  fields?: string[];
}

export function interestPicks(labels: string[]): RemoteInterestPick[] {
  const groups = fixtures.taxonomy.onboardingInterests;
  const kinds = Object.keys(groups) as RemoteInterestPick['kind'][];
  return labels.flatMap((category) => {
    const kind = kinds.find((k) => groups[k].includes(category));
    return kind ? [{ kind, category }] : [];
  });
}

const DIGEST_FREQUENCY = 'weekly';

async function currentDigestFrequency(): Promise<string> {
  try {
    const res = await authorizedFetch('/v1/me/newsletter');
    if (!res.ok) return DIGEST_FREQUENCY;
    const body = (await res.json()) as { data?: Partial<RemoteNewsletter> };
    return body.data?.frequency || DIGEST_FREQUENCY;
  } catch {
    return DIGEST_FREQUENCY;
  }
}

export async function subscribe(signup: DigestSignup): Promise<Delivery> {
  if (!API_BASE) return 'sent';
  const interests = await writeAsReader('PUT', '/v1/me/interests', {
    interests: interestPicks(signup.interests),
  });
  const digest = await writeAsReader('PUT', '/v1/me/newsletter', {
    subscribed: true,
    frequency: await currentDigestFrequency(),
    city: signup.city,
    interests: digestFields(signup.interests, signup.fields ?? []),
  });
  return interests === 'sent' ? digest : interests;
}

export function contributionSlot(kind: ContributeKind): string {
  return `contribution:${kind}`;
}

export async function submitContribution(
  kind: ContributeKind,
  values: Record<string, string>,
): Promise<Delivery> {
  return writeAsReader(
    'POST',
    '/v1/me/contributions',
    { kind, values },
    contributionSlot(kind),
  );
}

export const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const photoKeys = new Map<string, string>();

interface MediaUpload {
  imageId: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
}

export async function uploadPhoto(objectUrl: string): Promise<string> {
  if (!API_BASE) return '';
  const file = await (await fetch(objectUrl)).blob();
  if (!PHOTO_TYPES.has(file.type))
    throw new Error('Use a JPG, PNG or WebP photo.');
  let key = photoKeys.get(objectUrl);
  if (!key) photoKeys.set(objectUrl, (key = newIdempotencyKey()));
  const failed = 'Could not upload the photo. Try again in a moment.';
  const upload = await dataOf<MediaUpload>(
    await authorizedFetch('/v1/media/uploads', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ kind: 'cover', contentType: file.type }),
    }),
    failed,
  );
  const put = await fetch(upload.uploadUrl, {
    method: upload.method,
    headers: upload.headers,
    body: file,
  }).catch(() => null);
  if (!put?.ok) throw new Error(failed);
  const done = await dataOf<{ url: string }>(
    await authorizedFetch(`/v1/media/uploads/${upload.imageId}/complete`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
    }),
    failed,
  );
  return done.url;
}

export function submitAdRequest(
  values: Record<string, string>,
  ad: { photo: string; days: number; reference: string },
): Promise<Delivery> {
  return submitContribution('ad', {
    ...values,
    photo: ad.photo,
    days: String(ad.days),
    reference: ad.reference,
  });
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

async function allPages<T>(path: string, key: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await getData<Record<string, unknown> & { total: number }>(
      `${path}?limit=${PAGE_LIMIT}&offset=${page * PAGE_LIMIT}`,
    );
    const batch = (data[key] as T[] | undefined) ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_LIMIT || rows.length >= data.total) break;
  }
  return rows;
}

function recount(
  list: Category[],
  live: Listing[],
  livePlaces: Place[],
): Category[] {
  return list.map((c) => ({
    ...c,
    count:
      c.kind === 'place'
        ? livePlaces.filter((p) => p.type === c.name).length
        : live.filter((l) => l.kind === c.kind && l.category === c.name).length,
  }));
}

export type CatalogueStatus = 'loading' | 'ready' | 'failed';

export const catalogueStore = createStore<{
  status: CatalogueStatus;
  revision: number;
}>(null, { status: API_BASE ? 'loading' : 'ready', revision: 0 });

function settle(status: CatalogueStatus): void {
  catalogueStore.set((prev) => ({ status, revision: prev.revision + 1 }));
}

async function loadVenues(now: Date): Promise<void> {
  const [establishments, deals] = await Promise.allSettled([
    allPages<RemoteEstablishment>('/v1/establishments', 'establishments'),
    shown('promos')
      ? allPages<RemoteDeal>('/v1/deals', 'deals')
      : Promise.resolve([]),
  ]);
  const venues =
    establishments.status === 'fulfilled' ? establishments.value : [];
  const spots = venues.filter(isPlace);
  placeList = spots.map((row) => placeOf(row, () => ''));
  const offers = deals.status === 'fulfilled' ? deals.value : [];
  promoList = offers.map((deal) =>
    promoOf(
      deal,
      venues.find((v) => v.id === deal.establishmentId),
      '',
      now,
    ),
  );
  categoryList = recount(fixtures.categories, catalogue, placeList);
  settle(catalogueStore.get().status);
}

export async function loadCatalogue(now = new Date()): Promise<void> {
  if (!API_BASE) return;
  settle('loading');
  if (shown('places') || shown('promos')) void loadVenues(now);
  let status: CatalogueStatus = 'ready';
  try {
    const listed = await fetchListings();
    if (!Array.isArray(listed)) throw new TypeError('Listings were not a list');
    catalogue = stillOpen(listed.map(withSourcePhoto), now);
  } catch {
    catalogue = [];
    status = 'failed';
  }
  categoryList = recount(fixtures.categories, catalogue, placeList);
  settle(status);
}

export async function loadAccount(): Promise<void> {
  const session = sessionStore.get();
  if (!API_BASE || !session?.accessToken || outboxStore.get().length) return;
  try {
    const [interests, digest] = await Promise.all([
      authorizedFetch('/v1/me/interests'),
      authorizedFetch('/v1/me/newsletter'),
    ]);
    if (interests.ok) {
      const body = (await interests.json()) as {
        data: { interests: RemoteInterestPick[] };
      };
      const labels = body.data.interests.map((p) => p.category);
      if (labels.length) interestsStore.set(labels);
    }
    if (digest.ok) {
      const pref = ((await digest.json()) as { data: RemoteNewsletter }).data;
      const city = pref.city ?? cityStore.get();
      if (pref.city) cityStore.set(pref.city);
      fieldsStore.set(fieldsFromDigest(pref.interests ?? []));
      subscriptionStore.set(
        pref.subscribed
          ? {
              email: session.account?.email ?? `${session.provider} account`,
              city,
            }
          : null,
      );
    }
  } catch {
    return;
  }
}

export interface CitySuggestion {
  placeId: string;
  city: string;
  region: string;
  label: string;
}

export async function suggestCities(
  query: string,
  session: string,
): Promise<CitySuggestion[]> {
  if (!API_BASE || query.trim().length < 2) return [];
  const params = new URLSearchParams({ q: query.trim(), session });
  return getJson<CitySuggestion[]>(`/v1/cities/suggestions?${params}`);
}
