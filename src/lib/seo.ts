import { categoryBySlug, listingByKey, placeById, promoById } from './api';
import { type FeedKind, paths, type Route } from './router';
import { documentTitle } from './title';
import type { Category } from './types';
import {
  absoluteUrl,
  clipped,
  metaTags,
  SITE_DESCRIPTION,
  type MetaTag,
  type PageMeta,
} from './head';

export {
  absoluteUrl,
  metaTags,
  SITE_DESCRIPTION,
  SITE_ORIGIN,
  type MetaTag,
  type PageMeta,
} from './head';

export function feedOf(kind: Category['kind']): FeedKind {
  return kind === 'event'
    ? 'events'
    : kind === 'opportunity'
      ? 'opportunities'
      : 'places';
}

export function shortTitle(title: string): string {
  return title.replace(/ \| MEMBRS$/, '');
}

const FEED_DESCRIPTIONS: Record<FeedKind, string> = {
  events:
    'Events in Lagos, Abuja, Accra and beyond: gigs, meetups, workshops, conferences and more, updated every day.',
  opportunities:
    'Scholarships, grants, fellowships, jobs and competitions, with deadlines and awards, updated every day.',
  places: 'Places to eat, drink and visit, picked city by city.',
  promos: 'Deals and promotions from places and brands.',
};

function canonicalPath(route: Route): string {
  switch (route.page) {
    case 'home':
      return paths.home();
    case 'feed':
      return paths.feed(route.feed);
    case 'categories':
      return paths.categories(route.feed);
    case 'category':
      return paths.category(route.slug);
    case 'listing':
      return paths.listing(listingByKey(route.id)?.slug ?? route.id);
    case 'place':
      return paths.place(route.id);
    case 'promo':
      return paths.promo(route.id);
    case 'contribute':
      return paths.contribute(route.kind);
    case 'search':
      return paths.search();
    case 'for-you':
      return paths.forYou();
    case 'legal':
      return paths.legal(route.doc);
    case 'unsubscribe':
    case 'not-found':
      return paths.home();
  }
}

function describe(route: Route, title: string): string {
  switch (route.page) {
    case 'feed':
    case 'categories':
      return FEED_DESCRIPTIONS[route.feed];
    case 'category': {
      const category = categoryBySlug(route.slug);
      if (!category) return SITE_DESCRIPTION;
      return `${category.name} ${feedOf(category.kind)} on MEMBRS, updated every day.`;
    }
    case 'listing': {
      const listing = listingByKey(route.id);
      return listing?.blurb ? clipped(listing.blurb) : SITE_DESCRIPTION;
    }
    case 'place': {
      const place = placeById(route.id);
      return place
        ? clipped(`${place.name}, ${place.city}.`)
        : SITE_DESCRIPTION;
    }
    case 'promo': {
      const promo = promoById(route.id);
      return promo ? clipped(promo.title) : SITE_DESCRIPTION;
    }
    case 'contribute':
    case 'legal':
      return clipped(`${shortTitle(title)} on MEMBRS.`);
    default:
      return SITE_DESCRIPTION;
  }
}

const NEVER_INDEXED: ReadonlySet<Route['page']> = new Set([
  'search',
  'for-you',
  'unsubscribe',
  'not-found',
]);

export function pageMeta(route: Route): PageMeta {
  const title = documentTitle(route);
  return {
    title,
    description: describe(route, title),
    path: canonicalPath(route),
    indexable: !NEVER_INDEXED.has(route.page),
  };
}

function headTag(selector: string, create: () => HTMLElement): HTMLElement {
  const found = document.head.querySelector<HTMLElement>(selector);
  if (found) return found;
  const made = create();
  document.head.append(made);
  return made;
}

function setMeta(
  attribute: MetaTag['attribute'],
  key: string,
  content: string,
) {
  headTag(`meta[${attribute}="${key}"]`, () => {
    const meta = document.createElement('meta');
    meta.setAttribute(attribute, key);
    return meta;
  }).setAttribute('content', content);
}

export function applyPageMeta(meta: PageMeta): void {
  document.title = meta.title;
  for (const { attribute, key, content } of metaTags(meta)) {
    setMeta(attribute, key, content);
  }
  headTag('link[rel="canonical"]', () => {
    const link = document.createElement('link');
    link.rel = 'canonical';
    return link;
  }).setAttribute('href', absoluteUrl(meta.path));
}
