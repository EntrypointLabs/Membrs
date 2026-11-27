import { feedPath, useFeed, windowedPath, type FeedParams } from '../lib/api';
import { useIsPhone } from '../lib/media';
import { setSearchParams, useRoute } from '../lib/router';
import type { ListingKind } from '../lib/types';
import { ListingCard } from '../components/ListingCard';
import { ListingRow } from '../components/ListingRow';
import { Select } from '../components/Select';
import { RemoteGate } from '../components/CatalogueGate';
import {
  FilterLine,
  MoreFilters,
  PhoneFilterBar,
  RemoteFeedBody,
  Tally,
  webPageWindow,
} from './FeedLayout';
import { useFacetFilters } from './useFacetFilters';

type SortKey = 'popular' | 'soonest' | 'recent' | 'reward' | 'title';

const DEFAULT_SORT: SortKey = 'popular';

const SORT_NAMES: Record<SortKey, string> = {
  popular: 'Most popular',
  soonest: 'Soonest',
  recent: 'Recently added',
  reward: 'Highest reward',
  title: 'Name (A to Z)',
};

const SORTS: Record<ListingKind, SortKey[]> = {
  event: ['popular', 'soonest', 'recent', 'title'],
  opportunity: ['popular', 'soonest', 'reward', 'recent', 'title'],
};

const ON_THE_LINE = new Set(['type', 'state']);

export function FeedScreen({ kind }: { kind: ListingKind }) {
  const event = kind === 'event';
  const route = useRoute();
  const phone = useIsPhone();
  const sorts = SORTS[kind];
  const url = useFacetFilters(undefined, ON_THE_LINE);
  const asked = url.query.get('sort');
  const sort = sorts.find((s) => s === asked) ?? DEFAULT_SORT;
  const request: FeedParams = {
    kind,
    sectioned: sort === DEFAULT_SORT,
    picks: url.picks,
    sort: sort === DEFAULT_SORT ? undefined : sort,
    layout: phone ? 'phone' : 'web',
    ...webPageWindow(url.query.get('page'), phone),
  };
  const remote = useFeed(request);
  const filters = useFacetFilters(remote.data?.facets, ON_THE_LINE);
  const { menu, chip, lineFacets, panelFacets, panelActive, cleared } = filters;
  const isFiltered = filters.active.length > 0 || sort !== DEFAULT_SORT;
  const sortMenu = (className?: string) => (
    <Select
      label="Order"
      value={sort}
      onChange={(s) => filters.pick('sort', s === DEFAULT_SORT ? null : s)}
      options={sorts.map((s) => ({ value: s, label: SORT_NAMES[s] }))}
      className={className}
    />
  );
  const noun: [string, string] = event
    ? ['event', 'events']
    : ['opportunity', 'opportunities'];
  const clear = isFiltered
    ? () => setSearchParams({ ...cleared, sort: null, page: null })
    : undefined;
  const total = remote.data?.total ?? 0;

  return (
    <div className="page pt-0 md:pt-14">
      <h1 className="sr-only md:hidden">
        {event ? 'Events' : 'Opportunities'}
      </h1>
      <PhoneFilterBar
        summary={<Tally compact count={total} noun={noun} />}
        sort={sortMenu('h-10 bg-transparent px-2 text-[15px]')}
        onClear={clear}
      >
        {filters.facets.map(chip)}
      </PhoneFilterBar>
      <FilterLine summary={<Tally count={total} noun={noun} />} onClear={clear}>
        {lineFacets.map(menu)}
        <MoreFilters active={panelActive + Number(sort !== DEFAULT_SORT)}>
          {sortMenu()}
          {panelFacets.map(menu)}
        </MoreFilters>
      </FilterLine>
      <RemoteGate route={route} remote={remote}>
        {(page) => (
          <RemoteFeedBody
            page={page}
            filtered={page.sections.length === 0}
            noun={noun}
            path={(window) => feedPath({ ...request, ...window })}
            sectionPath={(section) =>
              windowedPath(remote.shownPath ?? feedPath(request), section)
            }
            row={(l) => <ListingRow listing={l} />}
            card={(l) => <ListingCard key={l.id} listing={l} />}
          />
        )}
      </RemoteGate>
    </div>
  );
}
