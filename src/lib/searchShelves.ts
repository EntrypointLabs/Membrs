import {
  categories,
  listings,
  mostPopular,
  places,
  promos,
  searchLocally,
} from './api';
import { paths } from './router';
import { shown } from './sections';
import { createStore } from './store';
import { plural, slugify } from './text';
import type { Listing } from './types';

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

function bestPictured<T extends { photo: string; photoUrl?: string }>(
  items: NonEmpty<T>,
): T {
  return items.find((i) => i.photoUrl) ?? items[0];
}

function categoryHref(kind: Listing['kind'], name: string): string {
  return paths.category(
    categories().find((c) => c.kind === kind && c.name === name)?.slug ??
      slugify(name),
  );
}

function categoryShelf(
  title: string,
  kind: Listing['kind'],
  noun: string,
): SearchShelf {
  const open = listings().filter((l) => l.kind === kind);
  return {
    title,
    tiles: groupedBy(open, (l) => l.category).map(({ name, items }) => {
      const cover = bestPictured(items);
      return {
        key: `${kind}:${name}`,
        label: name,
        detail: plural(items.length, noun),
        href: categoryHref(kind, name),
        photo: cover.photo,
        photoUrl: cover.photoUrl,
        tag: name,
      };
    }),
  };
}

function cityShelf(): SearchShelf {
  return {
    title: 'Around Africa',
    tiles: groupedBy(listings(), (l) => l.city).map(({ name, items }) => {
      const cover = bestPictured(items);
      return {
        key: `city:${name}`,
        label: name,
        detail: plural(items.length, 'listing'),
        href: paths.search(name),
        photo: cover.photo,
        photoUrl: cover.photoUrl,
        tag: name,
      };
    }),
  };
}

function popularShelf(): SearchShelf {
  const trending = mostPopular(SHELF_SIZE);
  const picks = trending.length ? trending : listings().slice(0, SHELF_SIZE);
  return {
    title: 'Popular right now',
    tiles: picks.map((l) => ({
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
    tiles: recent.filter(isReaderQuery).map((q) => {
      const top = searchLocally(q).find((h) => h.kind === 'listing');
      const cover = top?.kind === 'listing' ? top.item : undefined;
      return {
        key: `recent:${q}`,
        label: q,
        href: paths.search(q),
        photo: cover?.photo ?? '',
        photoUrl: cover?.photoUrl,
        tag: q,
      };
    }),
  };
}

export function searchShelves(recent: string[]): SearchShelf[] {
  return [
    recentShelf(recent),
    popularShelf(),
    categoryShelf('Events by category', 'event', 'event'),
    categoryShelf('Opportunities by type', 'opportunity', 'opening'),
    cityShelf(),
    placeShelf(),
    promoShelf(),
  ].filter((shelf): shelf is SearchShelf => Boolean(shelf?.tiles.length));
}
