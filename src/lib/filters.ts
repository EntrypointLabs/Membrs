import { JUST_ADDED_DAYS } from './config';
import { byPopularity, bySoonest, DAY_MS, hasDeadline } from './dates';
import { slugify, sourceName, titleCase } from './text';
import type { Listing, OpportunityListing } from './types';
import type { View } from './views';

/**
 * The feed filters. Every one is a facet: a listing names the values it has,
 * and a facet keeps it when the picked value is among them. Toggles, reward
 * thresholds and time windows all fit that one shape, which is what lets
 * each menu count its options against every other filter that is set.
 */
export interface Facet {
  /** The query parameter that carries the pick. */
  param: string;
  label: string;
  values: (listing: Listing) => string[];
  /** What to call a value. The listing is one that has it. */
  name: (value: string, listing: Listing) => string;
  /** Options keep the order of `order` rather than most matched first. */
  order?: readonly string[];
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export type Picks = Record<string, string | null>;

export const REGION_NAMES: Record<string, string> = {
  africa: 'Africa',
  europe: 'Europe',
  northAmerica: 'North America',
  latinAmerica: 'Latin America',
  middleEast: 'Middle East',
  asia: 'Asia',
  oceania: 'Oceania',
};

/** Minimum reward thresholds, in approximate US dollars. */
export const REWARD_STEPS = ['1000', '10000', '50000', '250000'] as const;

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

export function countryName(code: string): string {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** A table lookup that never answers with something inherited from Object. */
export function ownEntry<T>(
  table: Record<string, T>,
  key: string,
): T | undefined {
  return Object.hasOwn(table, key) ? table[key] : undefined;
}

/**
 * Only picks some listing actually carries survive, so a stale link or a
 * hand-typed value never empties the feed or puts its own text in a menu.
 */
export function knownPicks(
  items: Listing[],
  facets: Facet[],
  picks: Picks,
): Picks {
  return Object.fromEntries(
    facets.map((facet) => {
      const picked = picks[facet.param];
      const carried =
        picked && items.some((l) => facet.values(l).includes(picked));
      return [facet.param, carried ? picked : null];
    }),
  );
}

function single(value: string | null | undefined): string[] {
  return value ? [value] : [];
}

function usdValueOf(listing: OpportunityListing): number | null {
  const value = Number(listing.reward?.usdValue ?? NaN);
  return Number.isFinite(value) ? value : null;
}

const DEADLINE_KINDS = ['dated', 'rolling', 'undated'] as const;
const DEADLINE_NAMES: Record<string, string> = {
  dated: 'Has a deadline',
  rolling: 'Rolling',
  undated: 'No date given',
};

function deadlineKindOf(listing: OpportunityListing): string {
  if (listing.rolling) return 'rolling';
  return hasDeadline(listing) ? 'dated' : 'undated';
}

export const typeFacet: Facet = {
  param: 'type',
  label: 'Type',
  values: (l) => [slugify(l.category)],
  name: (_, l) => l.category,
};

export const kindFacet: Facet = {
  param: 'kind',
  label: 'Type',
  values: (l) => [l.kind],
  name: (value) => (value === 'event' ? 'Events' : 'Opportunities'),
  order: ['event', 'opportunity'],
};

export const topicFacet: Facet = {
  param: 'topic',
  label: 'Topic',
  values: (l) => (l.topics ?? []).map(slugify),
  name: (value, l) => l.topics?.find((t) => slugify(t) === value) ?? value,
};

export const regionFacet: Facet = {
  param: 'region',
  label: 'Region',
  values: (l) => single(l.region),
  name: (value) => ownEntry(REGION_NAMES, value) ?? value,
  order: Object.keys(REGION_NAMES),
};

export const countryFacet: Facet = {
  param: 'country',
  label: 'Country',
  values: (l) => single(l.country),
  name: countryName,
};

export const modeFacet: Facet = {
  param: 'mode',
  label: 'Format',
  values: (l) => [slugify(l.mode)],
  name: (_, l) => l.mode,
  order: ['in-person', 'hybrid', 'remote'],
};

export const sourceFacet: Facet = {
  param: 'source',
  label: 'Source',
  values: (l) => single(l.source),
  name: (value) => sourceName(value),
};

export function viewFacet<T extends Listing>(
  label: string,
  views: View<T>[],
): Facet {
  return {
    param: 'view',
    label,
    values: (l) => views.filter((v) => v.test(l as T)).map((v) => v.id),
    name: (value) => views.find((v) => v.id === value)?.label ?? value,
    order: views.map((v) => v.id),
  };
}

function namesACity(listing: Listing): boolean {
  const city = listing.city.trim();
  if (!city) return false;
  return !listing.country || city !== countryName(listing.country);
}

export const cityFacet: Facet = {
  param: 'city',
  label: 'City',
  values: (l) => (namesACity(l) ? [l.city.trim()] : []),
  name: (value) => value,
};

export const SHARED_FACETS: Facet[] = [
  cityFacet,
  topicFacet,
  modeFacet,
  regionFacet,
  countryFacet,
  sourceFacet,
];

export function budgetFacet(paid: (listing: Listing) => boolean): Facet {
  return {
    param: 'budget',
    label: 'Budget',
    values: (l) => {
      if (l.kind !== 'event') return [];
      if (l.free) return ['free'];
      return paid(l) ? ['paid'] : [];
    },
    name: (value) => (value === 'free' ? 'Free' : 'Paid'),
    order: ['free', 'paid'],
  };
}

function opportunityFacet(
  facet: Omit<Facet, 'values'> & {
    values: (listing: OpportunityListing) => string[];
  },
): Facet {
  return {
    ...facet,
    values: (l) => (l.kind === 'opportunity' ? facet.values(l) : []),
  };
}

export const fundingFacet = opportunityFacet({
  param: 'funding',
  label: 'Funding',
  values: (l) => (l.funding ? [slugify(l.funding)] : []),
  name: (_, l) => (l.kind === 'opportunity' && l.funding) || '',
});

export const levelFacet = opportunityFacet({
  param: 'level',
  label: 'Level',
  values: (l) => single(l.level),
  name: (value) => (value === 'phd' ? 'PhD' : titleCase(value)),
  order: ['undergraduate', 'masters', 'phd', 'postdoc'],
});

export const rewardFacet = opportunityFacet({
  param: 'reward',
  label: 'Reward',
  values: (l) => {
    const usd = usdValueOf(l);
    return usd === null ? [] : REWARD_STEPS.filter((step) => usd >= +step);
  },
  name: (value) =>
    REWARD_STEPS.some((step) => step === value)
      ? `$${Number(value) / 1000}K+`
      : value,
  order: REWARD_STEPS,
});

export const deadlineFacet = opportunityFacet({
  param: 'deadline',
  label: 'Deadline',
  values: (l) => [deadlineKindOf(l)],
  name: (value) => ownEntry(DEADLINE_NAMES, value) ?? value,
  order: DEADLINE_KINDS,
});

export const eligibleFacet = opportunityFacet({
  param: 'for',
  label: 'For applicants from',
  values: (l) => l.eligibility,
  name: countryName,
});

function keeps(listing: Listing, facets: Facet[], picks: Picks): boolean {
  return facets.every((facet) => {
    const picked = picks[facet.param];
    return !picked || facet.values(listing).includes(picked);
  });
}

export function filtered<T extends Listing>(
  items: T[],
  facets: Facet[],
  picks: Picks,
): T[] {
  return items.filter((l) => keeps(l, facets, picks));
}

/**
 * A facet's menu: every value the listings left by the other filters carry,
 * with how many each would show. The picked value stays even at zero so the
 * menu never hides what is set.
 */
export function optionsOf(
  facet: Facet,
  items: Listing[],
  facets: Facet[],
  picks: Picks,
): FacetOption[] {
  const others = facets.filter((f) => f !== facet);
  const counts = new Map<string, { label: string; count: number }>();
  for (const listing of filtered(items, others, picks)) {
    for (const value of new Set(facet.values(listing))) {
      const seen = counts.get(value);
      if (seen) seen.count++;
      else counts.set(value, { label: facet.name(value, listing), count: 1 });
    }
  }
  const picked = picks[facet.param];
  if (picked && !counts.has(picked)) {
    const carrier = items.find((l) => facet.values(l).includes(picked));
    const label = carrier ? facet.name(picked, carrier) : picked;
    counts.set(picked, { label, count: 0 });
  }
  const options = [...counts].map(([value, { label, count }]) => ({
    value,
    label,
    count,
  }));
  const order = facet.order;
  const rank = (value: string) => {
    const at = order?.indexOf(value) ?? -1;
    return at < 0 ? Infinity : at;
  };
  return order
    ? options.sort((a, b) => rank(a.value) - rank(b.value))
    : options.sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label),
      );
}

export type SortKey = 'popular' | 'soonest' | 'recent' | 'reward' | 'title';

export const DEFAULT_SORT: SortKey = 'popular';

export const SORT_NAMES: Record<SortKey, string> = {
  popular: 'Most popular',
  soonest: 'Soonest',
  recent: 'Recently added',
  reward: 'Highest reward',
  title: 'Name (A to Z)',
};

function listedTime(listing: Listing): number {
  const time = Date.parse(listing.listedAt ?? '');
  return Number.isFinite(time) ? time : 0;
}

/** Listings added in the last few days, newest first. */
export function justAdded(items: Listing[], now = Date.now()): Listing[] {
  const since = now - JUST_ADDED_DAYS * DAY_MS;
  return items.filter((l) => listedTime(l) >= since).sort(COMPARE.recent);
}

function rewardOf(listing: Listing): number {
  return listing.kind === 'opportunity' ? (usdValueOf(listing) ?? -1) : -1;
}

const COMPARE: Record<SortKey, (a: Listing, b: Listing) => number> = {
  popular: byPopularity,
  soonest: bySoonest,
  recent: (a, b) => listedTime(b) - listedTime(a) || bySoonest(a, b),
  reward: (a, b) => rewardOf(b) - rewardOf(a) || bySoonest(a, b),
  title: (a, b) => a.title.localeCompare(b.title),
};

export function sortedBy<T extends Listing>(items: T[], key: SortKey): T[] {
  return [...items].sort(COMPARE[key]);
}

export function sortKeyOf(param: string | null, allowed: SortKey[]): SortKey {
  return allowed.find((k) => k === param) ?? DEFAULT_SORT;
}
