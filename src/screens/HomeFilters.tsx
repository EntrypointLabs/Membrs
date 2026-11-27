import type { ReactNode } from 'react';
import { feedPath, useFeed, type FeedParams } from '../lib/api';
import { useIsPhone } from '../lib/media';
import { paths, setSearchParams } from '../lib/router';
import type { FeedPage, ListingKind } from '../lib/types';
import { ListingRow } from '../components/ListingRow';
import {
  FilterLine,
  MoreFilters,
  PhoneFilterBar,
  RemoteResults,
  Tally,
  webPageWindow,
} from './FeedLayout';
import { useFacetFilters } from './useFacetFilters';

const ON_THE_LINE = new Set(['listing', 'state']);

function kindCount(page: FeedPage | undefined, kind: ListingKind): number {
  const menu = page?.facets.find((f) => f.param === 'listing');
  return menu?.options.find((o) => o.value === kind)?.count ?? 0;
}

export function useHomeFilters(toolbar: ReactNode) {
  const phone = useIsPhone();
  const url = useFacetFilters(undefined, ON_THE_LINE);
  const request: FeedParams = {
    kind: 'all',
    picks: url.picks,
    ...(url.requested
      ? webPageWindow(url.query.get('page'), phone)
      : { limit: 0 }),
  };
  const remote = useFeed(request);
  const { menu, lineFacets, panelFacets, panelActive, cleared, active } =
    useFacetFilters(remote.data?.facets, ON_THE_LINE);
  const isFiltered = active.length > 0;
  const clear = isFiltered
    ? () => setSearchParams({ ...cleared, page: null })
    : undefined;
  const tallies = (
    <>
      <Tally
        count={kindCount(remote.data, 'event')}
        noun={['event', 'events']}
        href={paths.feed('events')}
      />
      <Tally
        count={kindCount(remote.data, 'opportunity')}
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

  const results =
    isFiltered && remote.data ? (
      <div className="mt-10">
        <RemoteResults
          page={remote.data}
          path={(window) => feedPath({ ...request, ...window })}
          noun="listings"
          row={(l) => <ListingRow listing={l} />}
          grid
        />
      </div>
    ) : null;

  return { line, results };
}
