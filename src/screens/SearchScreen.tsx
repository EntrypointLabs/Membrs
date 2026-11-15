import { useEffect, useState } from 'react';
import { searchCataloguePage, searchLocally } from '../lib/api';
import type { SearchHit } from '../lib/search';
import { navigate, paths } from '../lib/router';
import {
  rememberSearch,
  recentSearches,
  searchShelves,
} from '../lib/searchShelves';
import { useStore } from '../lib/store';
import { plural, titleCase } from '../lib/text';
import { Icon } from '../components/Icon';
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
    rememberSearch(query);
    let current = true;
    void searchCataloguePage(query, 0).then(({ hits, more }) => {
      if (current) setFound({ query, hits, pages: 1, more, loading: false });
    });
    return () => {
      current = false;
    };
  }, [query]);
  const hits = found.query === query ? found.hits : searchLocally(query);
  const more = found.query === query && found.more;
  const showMore = () => {
    setFound((f) => ({ ...f, loading: true }));
    void searchCataloguePage(query, found.pages).then((next) =>
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
      ),
    );
  };
  const go = (q: string) => navigate(paths.search(q), { replace: true });
  return (
    <div className="page pt-6 md:pt-14">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(text.trim());
        }}
        className="bg-soft border-line-2 focus-within:border-fg flex h-16 items-center gap-3 rounded-lg border px-5"
      >
        <Icon name="search" className="text-fg-3 h-5 w-5" />
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search events and opportunities"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-lg outline-none"
        />
      </form>
      {!query ? (
        <SearchStart />
      ) : (
        <>
          <p className="text-fg-3 border-line mt-8 border-b pb-5 text-[15px]">
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
                className="bg-btn hover:bg-btn-hover h-11 rounded-md px-5 text-[15px] font-semibold disabled:opacity-40"
              >
                {found.loading ? 'Loading' : 'Show more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SearchStart() {
  const recent = useStore(recentSearches);
  return (
    <div className="mt-10 space-y-10 md:mt-12 md:space-y-12">
      {searchShelves(recent).map((shelf) => (
        <section key={shelf.title}>
          <h2 className="mb-4 text-xl font-semibold tracking-tight md:text-2xl">
            {titleCase(shelf.title)}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shelf.tiles.map((tile) => (
              <SearchTile key={tile.key} tile={tile} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
