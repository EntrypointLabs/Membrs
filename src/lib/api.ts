import { CATALOGUE_PATH } from './catalogue-path';
import {
  API_BASE,
  CATALOGUE_TIMEOUT_MS,
  DEFAULT_COUNTRY,
  GRID_COLUMNS,
  MAX_PICKS,
} from './config';
import { authorizedFetch, sessionStore } from './auth';
import { shown } from './sections';
import {
  byPopularity,
  bySoonest,
  isComingSoon,
  soonness,
  stillOpen,
} from './dates';
import { collapsedRuns } from './runs';
import { distinctFamilies } from './families';
import { createStore } from './store';
import {
  apiFetch,
  dataOf,
  getData,
  getJson,
  getPreloadedJson,
  MembrsApiError,
  newIdempotencyKey,
} from './http';
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
import { placeLabel, readerPlaceOf } from './africa';
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
let everyNight: Listing[] = [];
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

export function listingByKey(key: string): Listing | undefined {
  return (
    everyNight.find((l) => l.id === key) ??
    everyNight.find((l) => l.slug === key)
  );
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
    .sort(byPopularity);
}

export const readerCountryStore = createStore<string>(
  'membrs.readerCountry',
  DEFAULT_COUNTRY,
);

/**
 * Saves a place label such as "Lagos, Nigeria" as the reader's state and
 * country. Answers false when the label names no African country, so the
 * caller can fall back to what the catalogue says about that city.
 */
export function chooseReaderPlace(label: string): boolean {
  const place = readerPlaceOf(label, readerCountryStore.get());
  if (!place.country) return false;
  cityStore.set(place.state || placeLabel(place));
  readerCountryStore.set(place.country);
  return true;
}

export function adoptReaderCity(city: string): void {
  if (!chooseReaderPlace(city)) cityStore.set(city);
}

export function canAttend(listing: Listing): boolean {
  const country = readerCountryStore.get();
  return (
    country === '' ||
    listing.kind !== 'event' ||
    listing.mode === 'Remote' ||
    listing.country === '' ||
    listing.country === country
  );
}

export function attendable(): Listing[] {
  return catalogue.filter(canAttend);
}

export function within(
  days: number,
  kind: Listing['kind'] | 'all' = 'all',
): Listing[] {
  if (kind === 'all') {
    return alternated(within(days, 'event'), within(days, 'opportunity'));
  }
  return attendable()
    .filter((l) => l.kind === kind)
    .filter((l) => (l.kind === 'event' ? l.inDays : l.daysLeft) <= days)
    .sort(byPopularity);
}

export function alternated<T>(first: T[], second: T[]): T[] {
  const mixed: T[] = [];
  for (let i = 0; i < Math.max(first.length, second.length); i++) {
    if (i < first.length) mixed.push(first[i] as T);
    if (i < second.length) mixed.push(second[i] as T);
  }
  return mixed;
}

export function closingSoon(): Listing[] {
  return catalogue
    .filter((l) => l.kind === 'opportunity' && l.closingSoon)
    .sort(byPopularity);
}

export function mostPopular(
  limit: number,
  skip: ReadonlySet<string> = new Set(),
  kind: Listing['kind'] | 'all' = 'all',
): Listing[] {
  if (kind === 'all') {
    return alternated(
      mostPopular(limit, skip, 'event'),
      mostPopular(limit, skip, 'opportunity'),
    ).slice(0, limit);
  }
  return distinctFamilies(
    feed(kind).filter(
      (l) => !skip.has(l.id) && isComingSoon(l) && canAttend(l),
    ),
    [],
    limit,
  );
}

const HERO_HORIZON_DAYS = 60;
const FAR_OFF_DAYS = 365;

export function heroPicks(
  limit = 3,
  pool: Listing[] = attendable(),
): Listing[] {
  const events = pool.filter((l) => l.kind === 'event');
  const near = events
    .filter((l) => soonness(l) <= HERO_HORIZON_DAYS)
    .sort(byPopularity);
  const later = events
    .filter((l) => soonness(l) > HERO_HORIZON_DAYS)
    .sort(byPopularity);
  return distinctFamilies([...near, ...later], [], limit);
}

export function similar(
  listing: Listing,
  limit = GRID_COLUMNS,
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

export const forYouStore = createStore<string[]>(null, []);

export function forYou(
  ids: readonly string[] = forYouStore.get(),
  pool: Listing[] = catalogue,
): Listing[] {
  const picked = new Set(ids);
  const matching = pool.filter((l) => picked.has(l.id)).sort(byPopularity);
  return alternated<Listing>(
    matching.filter((l) => l.kind === 'event'),
    matching.filter((l) => l.kind === 'opportunity'),
  );
}

export function interestMatches(
  labels: string[],
  pool: Listing[] = catalogue,
): string[] {
  const picks = interestPicks(labels);
  return pool
    .filter((l) =>
      picks.some((p) => p.kind === l.kind && p.category === l.category),
    )
    .map((l) => l.id);
}

export function inCity(
  city: string,
  kind: Listing['kind'] | 'all' = 'all',
): Listing[] {
  return catalogue
    .filter((l) => (kind === 'all' || l.kind === kind) && l.city === city)
    .sort(byPopularity);
}

export function listingsInCategory(name: string): Listing[] {
  return catalogue.filter((l) => l.category === name).sort(byPopularity);
}

/* Remote variants, for when VITE_API_BASE points at a backend. */

export async function fetchListings(): Promise<Listing[]> {
  return API_BASE
    ? getPreloadedJson<Listing[]>(CATALOGUE_PATH, CATALOGUE_TIMEOUT_MS)
    : catalogue;
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
  const item = listingByKey(id);
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

/**
 * The server refuses more than MAX_PICKS event or opportunity
 * interests, so picks saved on this device before the cap existed are trimmed
 * to the first ones rather than failing the whole save.
 */
export function interestPicks(labels: string[]): RemoteInterestPick[] {
  const groups = fixtures.taxonomy.onboardingInterests;
  const kinds = Object.keys(groups) as RemoteInterestPick['kind'][];
  const picks = labels.flatMap((category) => {
    const kind = kinds.find((k) => groups[k].includes(category));
    return kind ? [{ kind, category }] : [];
  });
  return picks.filter((pick, i) => {
    const limit = MAX_PICKS[pick.kind];
    return (
      limit === undefined ||
      picks.slice(0, i).filter((p) => p.kind === pick.kind).length < limit
    );
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

export type UnsubscribeScope = 'email' | 'weekly' | 'account';

/**
 * Turns off what a link covers and says what that was: the one email it came
 * from, every weekly email, or all email to the address. Replaying a used link
 * is harmless.
 */
export async function unsubscribe(token: string): Promise<UnsubscribeScope> {
  const { scope } = await dataOf<{ scope: UnsubscribeScope }>(
    await apiFetch('/v1/newsletter/unsubscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    }),
    'Could not unsubscribe. Open the link from the email again.',
  );
  return scope;
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
  return list.map((c) => {
    if (c.kind === 'place')
      return {
        ...c,
        count: livePlaces.filter((p) => p.type === c.name).length,
      };
    const inCategory = live.filter(
      (l) => l.kind === c.kind && l.category === c.name,
    );
    const lead = inCategory.filter((l) => l.photoUrl).sort(byPopularity)[0];
    return { ...c, count: inCategory.length, coverUrl: lead?.photoUrl };
  });
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

/**
 * How long to wait before each automatic retry of a failed catalogue load.
 * A brief outage or a cold backend usually clears within these few seconds,
 * so the reader sees the failure state only when the API stays down.
 */
export const CATALOGUE_RETRY_DELAYS_MS: readonly number[] = [1000, 3000, 9000];

// A 4xx answer will not change on a retry, so only network errors, timeouts,
// 5xx and rate limits are tried again.
function worthRetrying(error: unknown): boolean {
  return !(
    error instanceof MembrsApiError &&
    error.status < 500 &&
    error.status !== 429
  );
}

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function fetchCatalogue(
  retryDelays: readonly number[],
): Promise<Listing[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const listed = await fetchListings();
      if (!Array.isArray(listed))
        throw new TypeError('Listings were not a list');
      return listed;
    } catch (error) {
      const delay = retryDelays[attempt];
      if (delay === undefined || !worthRetrying(error)) throw error;
      await wait(delay);
    }
  }
}

let loading: Promise<void> | null = null;

/**
 * Loads the catalogue, retrying with backoff before it settles on failed.
 * A call while a load is already running joins it, so a Retry press during
 * the boot load does not start a second one.
 */
export function loadCatalogue(
  now = new Date(),
  retryDelays: readonly number[] = CATALOGUE_RETRY_DELAYS_MS,
): Promise<void> {
  if (!API_BASE) return Promise.resolve();
  loading ??= loadOnce(now, retryDelays).finally(() => {
    loading = null;
  });
  return loading;
}

async function loadOnce(
  now: Date,
  retryDelays: readonly number[],
): Promise<void> {
  settle('loading');
  if (shown('places') || shown('promos')) void loadVenues(now);
  let status: CatalogueStatus = 'ready';
  try {
    const listed = await fetchCatalogue(retryDelays);
    everyNight = stillOpen(listed.map(withSourcePhoto), now);
    catalogue = collapsedRuns(everyNight);
  } catch {
    everyNight = [];
    catalogue = [];
    status = 'failed';
  }
  categoryList = recount(fixtures.categories, catalogue, placeList);
  settle(status);
}

/**
 * Once the reader has told us about themselves, through their location or
 * their interests, reload their picks and take them back to the top, where
 * the shelves built from those picks now lead.
 */
export async function refreshForReader(): Promise<void> {
  await loadAccount();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export async function loadAccount(): Promise<void> {
  const session = sessionStore.get();
  if (!session?.accessToken) forYouStore.set([]);
  if (!API_BASE || !session?.accessToken || outboxStore.get().length) return;
  try {
    const [interests, digest, matches] = await Promise.all([
      authorizedFetch('/v1/me/interests'),
      authorizedFetch('/v1/me/newsletter'),
      authorizedFetch('/v1/me/for-you'),
    ]);
    if (matches.ok) {
      const listed: unknown = await matches.json();
      if (Array.isArray(listed))
        forYouStore.set(listed.map((l: { id: string }) => l.id));
    }
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
      if (pref.city) adoptReaderCity(pref.city);
      fieldsStore.set(fieldsFromDigest(pref.interests ?? []));
      subscriptionStore.set(
        pref.subscribed
          ? {
              email: session.account?.email ?? '',
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
