import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
  searchLocally,
} from '../lib/api';
import type { SearchHit } from '../lib/search';
import { useIsPhone } from '../lib/media';
import {
  PHONE_PILL,
  PHONE_PILL_PLACE,
  PHONE_SHEET,
  PILL_SPRING,
} from '../lib/motion';
import { navigate, parseRoute, paths } from '../lib/router';
import {
  rememberSearch,
  recentSearches,
  searchShelves,
  type SearchTileData,
} from '../lib/searchShelves';
import { useStore } from '../lib/store';
import { plural, titleCase } from '../lib/text';
import { Icon } from '../components/Icon';
import { GLASS } from '../components/MobileTabBar';
import { ListingRow } from '../components/ListingRow';
import { PlaceRow } from '../components/PlaceRow';
import { PromoRow } from '../components/PromoRow';
import { SearchTile } from '../components/SearchTile';

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
    hits: searchLocally(query),
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
  const hits = found.query === query ? found.hits : searchLocally(query);
  const more = found.query === query && found.more;
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
  const phone = useIsPhone();
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[50] bg-black/80 backdrop-blur-sm transition-opacity duration-300 md:hidden starting:opacity-0"
      />
      <div
        className={cn(
          'max-md:bg-bg max-md:ease-drawer pt-6 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-[55] max-md:overflow-y-auto max-md:overscroll-contain max-md:pb-28 max-md:transition-[translate,height] max-md:duration-300 md:pt-14 max-md:starting:translate-y-full',
          PHONE_SHEET,
        )}
      >
        <div className="page">
          <h1 className="sr-only">Search</h1>
          <motion.form
            layoutId={phone ? PHONE_PILL : undefined}
            transition={PILL_SPRING}
            style={phone ? { borderRadius: 9999 } : undefined}
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              go(text.trim());
            }}
            className={
              phone
                ? `${GLASS} ${PHONE_PILL_PLACE} flex h-14 items-center gap-3 pr-1.5 pl-5`
                : 'bg-soft border-line-2 focus-within:border-fg flex h-16 items-center gap-3 rounded-lg border px-5'
            }
          >
            <Icon name="search" className="text-fg-3 h-5 w-5" />
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search events and opportunities"
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
                className="text-destructive bg-soft-hover grid h-11 w-11 shrink-0 place-items-center rounded-full"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            )}
          </motion.form>
          {!query ? (
            <SearchStart />
          ) : (
            <div {...area('search_results')}>
              <p className="text-fg-3 border-line mt-2 border-b pb-5 text-[15px] md:mt-8">
                {more
                  ? `Showing ${hits.length} for “${query}”`
                  : `${plural(hits.length, 'result')} for “${query}”`}
              </p>
              {hits.length === 0 && (
                <p className="text-fg-3 py-20 text-center text-lg">
                  Nothing matched. Try a city, a category or fewer words.
                </p>
              )}
              {hits.map((h) =>
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
    </>
  );
}

function SearchStart() {
  const recent = useStore(recentSearches);
  return (
    <div className="mt-2 space-y-10 md:mt-12 md:space-y-12">
      {searchShelves(recent).map((shelf) => (
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
