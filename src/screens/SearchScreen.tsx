import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import {
  area,
  context,
  itemRef,
  track,
  trackItemOpened,
  type Events,
} from '../lib/analytics';
import {
  categoryBySlug,
  listingByKey,
  searchCataloguePage,
  useFeed,
  useSummary,
} from '../lib/api';
import type { SearchHit } from '../lib/search';
import { useIsPhone } from '../lib/media';
import { navigate, parseRoute, paths } from '../lib/router';
import {
  rememberSearch,
  recentSearches,
  searchShelves,
  type SearchTileData,
} from '../lib/searchShelves';
import { useStore } from '../lib/store';
import { plural, titleCase } from '../lib/text';
import {
  SEARCH_BAR,
  SEARCH_BAR_BUTTON,
  SEARCH_PLACEHOLDER,
} from '../components/FeedSearch';
import { Icon } from '../components/Icon';
import { TitleBar } from '../components/TitleBar';
import { ListingRow } from '../components/ListingRow';
import { PlaceRow } from '../components/PlaceRow';
import { PromoRow } from '../components/PromoRow';
import { SearchTile } from '../components/SearchTile';
import { FilterChips, MoreFilters } from './FeedLayout';
import { useFacetFilters } from './useFacetFilters';

const ON_THE_LINE = new Set(['type', 'state']);
const SEARCH_START_POPULAR = 8;
const MOST_SEARCH_IDS = 100;

interface Found {
  query: string;
  hits: SearchHit[];
  pages: number;
  more: boolean;
  loading: boolean;
}

/**
 * The search the reader just started, and from where. The screen remounts for
 * every query, so this lives outside it. The new screen reports it once its
 * first page of results is in, so the count is the one the reader sees.
 */
let started: {
  query: string;
  source: Events['search_submitted']['source'];
} | null = null;

function merged(first: SearchHit[], next: SearchHit[]): SearchHit[] {
  const seen = new Set(first.map((h) => `${h.kind}:${h.item.id}`));
  return [...first, ...next.filter((h) => !seen.has(`${h.kind}:${h.item.id}`))];
}

export function SearchScreen({ query: raw }: { query: string }) {
  const query = raw.trim();
  const [text, setText] = useState(raw);
  const [found, setFound] = useState<Found>(() => ({
    query,
    hits: [],
    pages: 1,
    more: false,
    loading: false,
  }));
  useEffect(() => {
    if (!query) return;
    let current = true;
    void searchCataloguePage(query, 0).then(({ hits, more }) => {
      if (!current) return;
      if (hits.length) rememberSearch(query);
      setFound({ query, hits, pages: 1, more, loading: false });
      if (started?.query === query) {
        track('search_submitted', {
          query,
          results: hits.length,
          has_more: more,
          source: started.source,
        });
        started = null;
      }
    });
    return () => {
      current = false;
    };
  }, [query]);
  const settled = found.query === query;
  const hits = settled ? found.hits : [];
  const more = settled && found.more;
  const phone = useIsPhone();
  const listingIds = hits.flatMap((h) =>
    h.kind === 'listing' ? [h.item.id] : [],
  );
  const url = useFacetFilters(undefined, ON_THE_LINE);
  const narrowed = useFeed(
    listingIds.length
      ? {
          kind: 'all',
          ids: listingIds.slice(0, MOST_SEARCH_IDS),
          picks: url.picks,
          limit: MOST_SEARCH_IDS,
        }
      : null,
  );
  const { menu, chip, active, facets } = useFacetFilters(
    narrowed.data?.facets,
    ON_THE_LINE,
  );
  const keptIds = new Set(narrowed.data?.items.map((l) => l.id));
  const shown =
    !phone && active.length
      ? hits.filter((h) => h.kind === 'listing' && keptIds.has(h.item.id))
      : hits;
  const chips = facets.some((f) => f.picked || f.options.length > 0);
  const showMore = () => {
    setFound((f) => ({ ...f, loading: true }));
    void searchCataloguePage(query, found.pages).then((next) => {
      track('search_more_loaded', {
        query,
        page: found.pages + 1,
        results: merged(found.hits, next.hits).length,
        has_more: next.more,
      });
      setFound((f) =>
        f.query === query
          ? {
              query,
              hits: merged(f.hits, next.hits),
              pages: f.pages + 1,
              more: next.more,
              loading: false,
            }
          : f,
      );
    });
  };
  const go = (q: string) => {
    if (q && q !== query) started = { query: q, source: 'form' };
    navigate(paths.search(q), { replace: true });
  };
  return (
    <div className="md:pt-14">
      <div className="page">
        <h1 className="sr-only">Search</h1>
        <TitleBar desktop>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go(text.trim());
            }}
            className={
              phone
                ? cn(SEARCH_BAR, 'focus-within:border-fg gap-3')
                : 'bg-soft border-line-2 focus-within:border-fg flex h-16 items-center gap-3 rounded-lg border px-5'
            }
          >
            <Icon name="search" className="text-fg-3 h-5 w-5" />
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER}
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent text-lg outline-none max-md:text-base"
            />
            {phone && (
              <button
                type="button"
                aria-label="Close search"
                onClick={() =>
                  window.history.length > 1
                    ? window.history.back()
                    : navigate(paths.home())
                }
                className={`${SEARCH_BAR_BUTTON} text-destructive bg-soft-hover grid w-9 place-items-center`}
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            )}
          </form>
        </TitleBar>
        {!query ? (
          <SearchStart />
        ) : (
          <div {...area('search_results')}>
            {chips && (
              <FilterChips className="mt-6 hidden flex-wrap md:flex">
                <MoreFilters align="start" active={active.length}>
                  {facets.map(menu)}
                </MoreFilters>
                {facets.map(chip)}
              </FilterChips>
            )}
            <p className="text-fg-3 border-line mt-2 border-b pb-5 text-[15px] md:mt-8">
              {more
                ? `Showing ${shown.length} for “${query}”`
                : `${plural(shown.length, 'result')} for “${query}”`}
            </p>
            {settled && shown.length === 0 && (
              <p className="text-fg-3 py-20 text-center text-lg">
                Nothing matched. Try a city, a category or fewer words.
              </p>
            )}
            {shown.map((h) =>
              h.kind === 'listing' ? (
                <ListingRow key={h.item.id} listing={h.item} />
              ) : h.kind === 'place' ? (
                <PlaceRow key={h.item.id} place={h.item} />
              ) : (
                <PromoRow key={h.item.id} promo={h.item} />
              ),
            )}
            {more && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={showMore}
                  disabled={found.loading}
                  {...context({ action: 'search_show_more' })}
                  className="bg-btn hover:bg-btn-hover h-11 rounded-md px-5 text-[15px] font-semibold disabled:opacity-40"
                >
                  {found.loading ? 'Loading' : 'Show more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchStart() {
  const recent = useStore(recentSearches);
  const summary = useSummary().data;
  const popular =
    useFeed({ kind: 'all', limit: SEARCH_START_POPULAR }).data?.items ?? [];
  return (
    <div className="mt-2 space-y-10 md:mt-12 md:space-y-12">
      {searchShelves(recent, summary, popular).map((shelf) => (
        <section
          key={shelf.title}
          {...area('search_shelf')}
          {...context({ shelf: shelf.title })}
        >
          <h2 className="mb-4 text-xl font-semibold tracking-tight md:text-2xl">
            {titleCase(shelf.title)}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shelf.tiles.map((tile) => (
              <SearchTile
                key={tile.key}
                tile={tile}
                onClick={(e) => trackTile(e.currentTarget, tile)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Tiles that run a search count as suggestions; the rest open a listing or a
 * category, and are tracked the same way as everywhere else.
 */
function trackTile(link: HTMLAnchorElement, tile: SearchTileData): void {
  const route = parseRoute(tile.href);
  if (route.page === 'search') {
    started = { query: route.query.trim(), source: 'suggestion' };
  } else if (route.page === 'listing') {
    const listing = listingByKey(route.id);
    if (listing) trackItemOpened(link, itemRef.listing(listing), 'search_tile');
  } else if (route.page === 'category' || route.page === 'feed') {
    const section =
      route.page === 'feed'
        ? route.feed
        : categoryBySlug(route.slug)?.kind === 'opportunity'
          ? 'opportunities'
          : 'events';
    track('category_clicked', { category: tile.label, section }, link);
  }
}
