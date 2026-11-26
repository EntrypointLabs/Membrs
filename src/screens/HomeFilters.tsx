import { type ReactNode, useMemo } from 'react';
import { feed } from '../lib/api';
import { kindFacet, SHARED_FACETS } from '../lib/filters';
import { paths, setSearchParams } from '../lib/router';
import type { Listing } from '../lib/types';
import { ListingCard } from '../components/ListingCard';
import { ListingRow } from '../components/ListingRow';
import {
  FeedBody,
  FilterLine,
  MoreFilters,
  PhoneFilterBar,
  Tally,
} from './FeedLayout';
import { useFacetFilters } from './useFacetFilters';

const FACETS = [kindFacet, ...SHARED_FACETS];
const ON_THE_LINE = new Set(['kind', 'city']);

export function useHomeFilters(toolbar: ReactNode) {
  const all = useMemo(() => feed(), []);
  const { menu, items, active, lineFacets, panelFacets, panelActive, cleared } =
    useFacetFilters(all, FACETS, ON_THE_LINE);
  const isFiltered = active.length > 0;
  const count = (kind: Listing['kind']) =>
    items.filter((l) => l.kind === kind).length;
  const clear = isFiltered
    ? () => setSearchParams({ ...cleared, page: null })
    : undefined;
  const tallies = (
    <>
      <Tally
        count={count('event')}
        noun={['event', 'events']}
        href={paths.feed('events')}
      />
      <Tally
        count={count('opportunity')}
        noun={['opportunity', 'opportunities']}
        href={paths.feed('opportunities')}
      />
    </>
  );

  const line = (
    <>
      <PhoneFilterBar toolbar={toolbar} onClear={clear} />
      <FilterLine summary={tallies} onClear={clear}>
        {lineFacets.map(menu)}
        <MoreFilters active={panelActive}>{panelFacets.map(menu)}</MoreFilters>
      </FilterLine>
    </>
  );

  const results = isFiltered ? (
    <div className="mt-10">
      <FeedBody
        items={items}
        views={[]}
        filtered
        noun={['listing', 'listings']}
        keyOf={(l) => l.id}
        row={(l) => <ListingRow listing={l} />}
        rails={[]}
        card={(l) => <ListingCard key={l.id} listing={l} />}
      />
    </div>
  ) : null;

  return { line, results };
}
