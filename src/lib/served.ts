import { parseRoute } from './router';

export interface ServedListing {
  id: string;
  title: string;
  blurb: string;
}

let served: ServedListing | null = null;

/**
 * The server renders a listing's title and blurb into #root, so a reader who
 * lands on /listing/:slug while the API is down still has those to read. This
 * keeps them before React replaces the markup.
 */
export function keepServedListing(root: Element, location: string): void {
  const route = parseRoute(location);
  const title = root.querySelector('main > h1')?.textContent?.trim() ?? '';
  served =
    route.page === 'listing' && title
      ? {
          id: route.id,
          title,
          blurb: root.querySelector('main > p')?.textContent?.trim() ?? '',
        }
      : null;
}

export function servedListing(id: string): ServedListing | null {
  return served?.id === id ? served : null;
}
