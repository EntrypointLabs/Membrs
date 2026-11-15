import {
  categoryBySlug,
  contributeForm,
  listingById,
  placeById,
  promoById,
} from './api';
import type { FeedKind, Route } from './router';
import { titleCase } from './text';
import type { LegalSlug } from './types';

const SITE_NAME = 'MEMBRS';

export const LEGAL_TITLES: Record<LegalSlug, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
  guidelines: 'Listing Guidelines',
  advertising: 'Advertising Policy',
};

const FEED_TITLES: Record<FeedKind, string> = {
  events: 'Events',
  opportunities: 'Opportunities',
  places: 'Places',
  promos: 'Promos',
};

function pageName(route: Route): string | undefined {
  switch (route.page) {
    case 'home':
      return undefined;
    case 'feed':
      return FEED_TITLES[route.feed];
    case 'categories':
      return `${FEED_TITLES[route.feed]} Categories`;
    case 'category':
      return categoryBySlug(route.slug)?.name ?? 'Category';
    case 'listing':
      return listingById(route.id)?.title ?? 'Listing';
    case 'place':
      return placeById(route.id)?.name ?? 'Place';
    case 'promo':
      return promoById(route.id)?.title ?? 'Promo';
    case 'contribute':
      return titleCase(contributeForm(route.kind).title);
    case 'search':
      return route.query.trim() ? `Search: ${route.query.trim()}` : 'Search';
    case 'legal':
      return LEGAL_TITLES[route.doc];
    case 'not-found':
      return 'Page Not Found';
  }
}

export function documentTitle(route: Route): string {
  const name = pageName(route);
  return name ? `${name} | ${SITE_NAME}` : SITE_NAME;
}
