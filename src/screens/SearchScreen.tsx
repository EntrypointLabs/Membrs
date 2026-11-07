import { useMemo, useState } from 'react';
import { listings, places, promos, searchSuggestions } from '../lib/api';
import { navigate, paths } from '../lib/router';
import { search } from '../lib/search';
import { plural } from '../lib/text';
import { Icon } from '../components/Icon';
import { ListingRow } from '../components/ListingRow';
import { PlaceRow } from '../components/PlaceRow';
import { PromoCard } from '../components/PromoCard';

export function SearchScreen({ query }: { query: string }) {
  const [text, setText] = useState(query);
  const hits = useMemo(
    () =>
      search(query, {
        listings: listings(),
        places: places(),
        promos: promos(),
      }),
    [query],
  );
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
          placeholder="Search events, opportunities, places and promos"
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-lg outline-none"
        />
      </form>
      {!query ? (
        <div className="mt-10">
          <p className="text-fg-3 mb-3 text-sm font-semibold">Try</p>
          <div className="flex flex-wrap gap-2">
            {searchSuggestions().map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setText(s);
                  go(s);
                }}
                className="bg-btn hover:bg-btn-hover rounded-sm px-4 py-2 text-[15px]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="text-fg-3 border-line mt-8 border-b pb-5 text-[15px]">
            {plural(hits.length, 'result')} for “{query}”
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
              <div
                key={h.item.id}
                className="border-line max-w-md border-b py-8"
              >
                <PromoCard promo={h.item} />
              </div>
            ),
          )}
        </>
      )}
    </div>
  );
}
