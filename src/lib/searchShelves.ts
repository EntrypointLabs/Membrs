import { categories, places, promos } from './api';
import { paths } from './router';
import { shown } from './sections';
import { createStore } from './store';
import { plural, slugify } from './text';
import type {
  CatalogueSummary,
  CityCount,
  ListingKind,
  ListingSummary,
} from './types';

export interface SearchTileData {
  key: string;
  label: string;
  detail?: string;
  href: string;
  photo: string;
  photoUrl?: string;
  tag: string;
}

export interface SearchShelf {
  title: string;
  tiles: SearchTileData[];
}

const SHELF_SIZE = 8;
const RECENT_LIMIT = 8;
const CATCH_ALL = new Set(['other', 'others', 'general', 'misc']);

export const recentSearches = createStore<string[]>(
  'membrs.recentSearches',
  [],
);

/**
 * A query is worth offering again only if a reader could have meant it: no
 * markup, which is what a probe or a paste of HTML looks like.
 */
function isReaderQuery(query: string): boolean {
  return query.trim() !== '' && !/[<>]/.test(query);
}

/** Remember a search that found something, so a shortcut always leads somewhere. */
export function rememberSearch(query: string): void {
  const q = query.trim();
  if (!isReaderQuery(q)) return;
  recentSearches.set((prev) =>
    [q, ...prev.filter((p) => p.toLowerCase() !== q.toLowerCase())].slice(
      0,
      RECENT_LIMIT,
    ),
  );
}

type NonEmpty<T> = [T, ...T[]];

interface Group<T> {
  name: string;
  items: NonEmpty<T>;
}

function groupedBy<T>(items: T[], nameOf: (item: T) => string): Group<T>[] {
  const groups = new Map<string, NonEmpty<T>>();
  for (const item of items) {
    const name = nameOf(item).trim();
    if (!name || CATCH_ALL.has(name.toLowerCase())) continue;
    groups.set(name, [...(groups.get(name) ?? []), item] as NonEmpty<T>);
  }
  return [...groups]
    .map(([name, grouped]) => ({ name, items: grouped }))
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, SHELF_SIZE);
}

function categoryHref(kind: ListingKind, name: string): string {
  return paths.category(
    categories().find((c) => c.kind === kind && c.name === name)?.slug ??
      slugify(name),
  );
}

function named<T extends { name: string }>(items: T[]): T[] {
  return items
    .filter((i) => i.name.trim() && !CATCH_ALL.has(i.name.trim().toLowerCase()))
    .slice(0, SHELF_SIZE);
}

function categoryShelf(
  summary: CatalogueSummary,
  title: string,
  kind: ListingKind,
  noun: string,
): SearchShelf {
  return {
    title,
    tiles: named(summary.categories.filter((c) => c.kind === kind)).map(
      (c) => ({
        key: `${kind}:${c.name}`,
        label: c.name,
        detail: plural(c.count, noun),
        href: categoryHref(kind, c.name),
        photo: '',
        photoUrl: c.cover || undefined,
        tag: c.name,
      }),
    ),
  };
}

function cityShelf(cities: CityCount[]): SearchShelf {
  return {
    title: 'Around Africa',
    tiles: named(cities).map((c) => ({
      key: `city:${c.name}`,
      label: c.name,
      detail: plural(c.count, 'listing'),
      href: paths.search(c.name),
      photo: '',
      photoUrl: c.cover || undefined,
      tag: c.name,
    })),
  };
}

function popularShelf(popular: ListingSummary[]): SearchShelf {
  return {
    title: 'Popular right now',
    tiles: popular.slice(0, SHELF_SIZE).map((l) => ({
      key: `listing:${l.id}`,
      label: l.title,
      detail: l.category,
      href: paths.listing(l.slug),
      photo: l.photo,
      photoUrl: l.photoUrl,
      tag: l.category,
    })),
  };
}

function placeShelf(): SearchShelf | null {
  if (!shown('places')) return null;
  return {
    title: 'Places to go',
    tiles: groupedBy(places(), (p) => p.type).map(({ name, items }) => ({
      key: `place:${name}`,
      label: name,
      detail: plural(items.length, 'place'),
      href: `${paths.feed('places')}?type=${slugify(name)}`,
      photo: items[0].photo,
      tag: name,
    })),
  };
}

function promoShelf(): SearchShelf | null {
  if (!shown('promos')) return null;
  return {
    title: 'Deals and promos',
    tiles: groupedBy(promos(), (p) => p.category).map(({ name, items }) => ({
      key: `promo:${name}`,
      label: name,
      detail: plural(items.length, 'promo'),
      href: `${paths.feed('promos')}?type=${slugify(name)}`,
      photo: items[0].photo,
      tag: name,
    })),
  };
}

function recentShelf(recent: string[]): SearchShelf {
  return {
    title: 'Recent searches',
    tiles: recent.filter(isReaderQuery).map((q) => ({
      key: `recent:${q}`,
      label: q,
      href: paths.search(q),
      photo: '',
      tag: q,
    })),
  };
}

export function searchShelves(
  recent: string[],
  summary: CatalogueSummary | undefined,
  popular: ListingSummary[],
): SearchShelf[] {
  return [
    recentShelf(recent),
    popularShelf(popular),
    summary && categoryShelf(summary, 'Events by category', 'event', 'event'),
    summary &&
      categoryShelf(summary, 'Opportunities by type', 'opportunity', 'opening'),
    summary && cityShelf(summary.cities),
    placeShelf(),
    promoShelf(),
  ].filter((shelf): shelf is SearchShelf => Boolean(shelf?.tiles.length));
}
