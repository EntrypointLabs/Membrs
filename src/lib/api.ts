import { API_BASE, DEFAULT_COUNTRY, MAX_PICKS } from './config';
import { authorizedFetch, sessionStore } from './auth';
import { shown } from './sections';
import { createStore } from './store';
import { apiFetch, dataOf, getData, getJson, newIdempotencyKey } from './http';
import { outboxStore, writeAsReader, type Delivery } from './outbox';
import type { SearchHit } from './search';
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
import {
  loadResource,
  rememberResponses,
  useResource,
  watchResources,
  type Remote,
} from './resources';
import type {
  CatalogueSummary,
  Category,
  ContributeForm,
  ContributeKind,
  FeedPage,
  HomePage,
  LaunchCity,
  LegalDocument,
  LegalSlug,
  Listing,
  ListingDetail,
  ListingKind,
  ListingSummary,
  Place,
  Promo,
  Section,
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

let placeList: Place[] = [];
let promoList: Promo[] = [];
let summary: CatalogueSummary | null = null;
let categoryList: Category[] = recount(fixtures.categories, null, []);

const known = new Map<string, ListingSummary>();
const slugs = new Map<string, string>();

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

export function listingByKey(key: string): ListingSummary | undefined {
  return known.get(key) ?? known.get(slugs.get(key) ?? '');
}

export function knownListings(): ListingSummary[] {
  return [...known.values()];
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

export const readerCountryStore = createStore<string>(
  'membrs.readerCountry',
  DEFAULT_COUNTRY,
);

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

export const forYouStore = createStore<ListingSummary[]>(null, []);

function isListing(value: unknown): value is ListingSummary {
  const listing = value as Partial<ListingSummary> | null;
  return (
    typeof listing?.id === 'string' &&
    typeof listing.slug === 'string' &&
    (listing.kind === 'event' || listing.kind === 'opportunity')
  );
}

function rememberListing(listing: ListingSummary): ListingSummary {
  const shown = withSourcePhoto(listing as Listing) as ListingSummary;
  const already = known.get(shown.id);
  if (!already || Object.keys(shown).length >= Object.keys(already).length)
    known.set(shown.id, shown);
  slugs.set(shown.slug, shown.id);
  return shown;
}

function prepared(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(prepared);
  if (!value || typeof value !== 'object') return value;
  if (isListing(value)) return rememberListing(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, prepared(inner)]),
  );
}

rememberResponses(prepared);

function queryOf(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

export interface SectionWindow {
  id: string;
  offset: number;
  limit: number;
  category?: string;
}

function windowParams(section?: SectionWindow) {
  return section
    ? {
        section: section.id,
        offset: section.offset,
        limit: section.limit,
        category: section.category,
      }
    : {};
}

export function windowedPath(path: string, section: SectionWindow): string {
  const [base, query = ''] = path.split('?');
  const params = new URLSearchParams(query);
  params.delete('category');
  for (const [key, value] of Object.entries(windowParams(section))) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return `${base}?${params}`;
}

export type Layout = 'web' | 'phone';

export interface HomeParams {
  layout: Layout;
  country: string;
  state: string;
  near?: string;
  around?: string[];
  viewed: string[];
  interests?: string[];
  popular?: ListingKind | 'all';
  range?: 'week' | 'month';
  weekKind?: ListingKind | 'all';
}

const HOME_PATH = '/v1/listings/home';

export const FOR_YOU_SECTION = 'forYou';

export const LARGEST_SECTION_WINDOW = 100;

export function homePath(params: HomeParams, section?: SectionWindow): string {
  return `${HOME_PATH}${queryOf({
    layout: params.layout,
    country: params.country,
    state: params.state,
    near: params.near,
    around: params.around?.join(','),
    viewed: params.viewed.join(','),
    interests: params.interests?.join(','),
    popular: params.popular === 'all' ? undefined : params.popular,
    range: params.range === 'week' ? undefined : params.range,
    weekKind: params.weekKind === 'all' ? undefined : params.weekKind,
    ...windowParams(section),
  })}`;
}

export function prefetchHome(params: HomeParams): void {
  if (API_BASE) void loadResource(homePath(params)).catch(() => undefined);
}

export function useHome(params: HomeParams): Remote<HomePage> {
  return useResource<HomePage>(homePath(params), true);
}

export function useHomeSection(
  params: HomeParams | null,
  section: SectionWindow,
): Remote<HomePage> {
  return useResource<HomePage>(params && homePath(params, section));
}

export interface FeedParams {
  kind: ListingKind | 'all';
  sectioned?: boolean;
  picks?: Record<string, string | null>;
  sort?: string;
  ids?: string[];
  layout?: Layout;
  offset?: number;
  limit?: number;
}

const FEED_SCOPE = new Set([
  'shape',
  'kind',
  'sort',
  'ids',
  'layout',
  'offset',
  'limit',
  'section',
]);

export function feedPath(params: FeedParams, section?: SectionWindow): string {
  const picks = Object.fromEntries(
    Object.entries(params.picks ?? {})
      .filter(([key, value]) => value && !FEED_SCOPE.has(key))
      .sort(([a], [b]) => a.localeCompare(b)),
  ) as Record<string, string>;
  return `/v1/listings/feed${queryOf({
    shape: params.sectioned ? 'sections' : undefined,
    kind: params.kind,
    ...picks,
    sort: params.sort,
    ids: params.ids?.join(','),
    layout: params.layout === 'phone' ? 'phone' : undefined,
    offset: params.offset || undefined,
    limit: params.limit,
    ...windowParams(section),
  })}`;
}

export function useFeed(params: FeedParams | null): Remote<FeedPage> {
  return useResource<FeedPage>(params && feedPath(params), true);
}

const MOST_IDS = 100;

export function useListingsByIds(ids: string[]): ListingSummary[] {
  const known = ids.flatMap((id) => {
    const listing = listingByKey(id);
    return listing ? [listing] : [];
  });
  const missing = known.length < ids.length;
  const fetched = useFeed(
    missing
      ? { kind: 'all', ids: ids.slice(0, MOST_IDS), limit: MOST_IDS }
      : null,
  );
  return missing ? (fetched.data?.items ?? known) : known;
}

export function useFeedAt(path: string | null): Remote<FeedPage> {
  return useResource<FeedPage>(path);
}

function useSectionPage(path: string | null): Remote<FeedPage | HomePage> {
  return useResource<FeedPage | HomePage>(path, true);
}

function listingPath(key: string): string {
  return `/v1/listings/${encodeURIComponent(key)}`;
}

export function useListing(key: string): Remote<ListingDetail> {
  return useResource<ListingDetail>(listingPath(key));
}

export function loadListing(key: string): Promise<ListingDetail> {
  return loadResource<ListingDetail>(listingPath(key));
}

const SUMMARY_PATH = '/v1/listings/summary';

export function useSummary(): Remote<CatalogueSummary> {
  const remote = useResource<CatalogueSummary>(SUMMARY_PATH);
  if (remote.data && remote.data !== summary) applySummary(remote.data);
  return remote;
}

export async function loadSummary(): Promise<CatalogueSummary | null> {
  if (!API_BASE) return null;
  const loaded = await loadResource<CatalogueSummary>(SUMMARY_PATH);
  applySummary(loaded);
  return loaded;
}

function applySummary(loaded: CatalogueSummary): void {
  summary = loaded;
  categoryList = recount(fixtures.categories, summary, placeList);
}

export function catalogueSummary(): CatalogueSummary | null {
  return summary;
}

const SEARCH_LIMIT = 50;

const SEARCHABLE = (
  [
    ['events', 'listing'],
    ['opportunities', 'listing'],
    ['establishments', 'place'],
    ['deals', 'promo'],
  ] as const
).filter(([path]) => shown(path));

interface Scored {
  id: string;
  score: number;
}

function venueHit(kind: 'place' | 'promo', { id, score }: Scored): SearchHit[] {
  if (kind === 'place') {
    const item = placeById(id);
    return item ? [{ kind, item, score }] : [];
  }
  const item = promoById(id);
  return item ? [{ kind, item, score }] : [];
}

async function listingHits(scored: Scored[]): Promise<SearchHit[]> {
  if (!scored.length) return [];
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const page = await loadResource<FeedPage>(
    feedPath({
      kind: 'all',
      ids: ranked.slice(0, MOST_IDS).map((s) => s.id),
      limit: MOST_IDS,
    }),
  );
  const scores = new Map(ranked.map((s) => [s.id, s.score]));
  return page.items.map((item) => ({
    kind: 'listing',
    item,
    score: scores.get(item.id) ?? 0,
  }));
}

export async function searchCataloguePage(
  query: string,
  page: number,
): Promise<{ hits: SearchHit[]; more: boolean }> {
  const q = query.trim();
  if (!API_BASE || !q) return { hits: [], more: false };
  const params = new URLSearchParams({ q, limit: String(SEARCH_LIMIT) });
  if (page > 0) params.set('offset', String(page * SEARCH_LIMIT));
  try {
    const pages = await Promise.all(
      SEARCHABLE.map(([path]) =>
        getData<{ results: Scored[] }>(`/v1/${path}/search?${params}`),
      ),
    );
    const found = pages.map((p, i) => ({
      kind: SEARCHABLE[i]![1],
      results: p.results,
    }));
    const listings = await listingHits(
      found.flatMap((f) => (f.kind === 'listing' ? f.results : [])),
    );
    const venues = found.flatMap(({ kind, results }) =>
      kind === 'listing' ? [] : results.flatMap((r) => venueHit(kind, r)),
    );
    const hits = [...listings, ...venues].sort((a, b) => b.score - a.score);
    const more = pages.some((p) => p.results.length >= SEARCH_LIMIT);
    return { hits, more };
  } catch {
    return { hits: [], more: false };
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
  loaded: CatalogueSummary | null,
  livePlaces: Place[],
): Category[] {
  return list.map((c) => {
    if (c.kind === 'place')
      return {
        ...c,
        count: livePlaces.filter((p) => p.type === c.name).length,
      };
    const counted = loaded?.categories.find(
      (l) => l.kind === c.kind && l.name === c.name,
    );
    return {
      ...c,
      count: counted?.count ?? 0,
      coverUrl: counted?.cover || undefined,
    };
  });
}

export type CatalogueStatus = 'loading' | 'ready' | 'failed';

export const catalogueStore = createStore<{
  status: CatalogueStatus;
  revision: number;
}>(null, { status: 'ready', revision: 0 });

watchResources((status) =>
  catalogueStore.set((prev) => ({ status, revision: prev.revision + 1 })),
);

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
  categoryList = recount(fixtures.categories, summary, placeList);
  catalogueStore.set((prev) => ({ ...prev, revision: prev.revision + 1 }));
}

export function loadVenuesIfShown(now = new Date()): Promise<void> {
  if (!API_BASE || !(shown('places') || shown('promos')))
    return Promise.resolve();
  return loadVenues(now);
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
      const listed: unknown = prepared(await matches.json());
      if (Array.isArray(listed)) forYouStore.set(listed.filter(isListing));
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

export type SectionPath = (window: SectionWindow) => string;

export function useSectionItems(
  section: Section,
  page: number,
  size: number,
  pathOf: SectionPath,
  category?: string,
): { items: ListingSummary[]; total: number; loading: boolean } {
  const fromFirstPage =
    page === 1 &&
    !category &&
    section.items.length >= Math.min(size, section.total);
  const remote = useSectionPage(
    fromFirstPage
      ? null
      : pathOf({
          id: section.id,
          offset: (page - 1) * size,
          limit: size,
          category,
        }),
  );
  if (fromFirstPage)
    return {
      items: section.items.slice(0, size),
      total: section.total,
      loading: false,
    };
  const fetched = remote.data?.sections[0];
  return {
    items: fetched?.items ?? [],
    total: fetched?.total ?? section.total,
    loading: remote.status === 'loading' || remote.stale,
  };
}
