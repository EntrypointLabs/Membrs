import { useMemo } from 'react';
import { feed } from '../lib/api';
import { CONCERT_CATEGORY } from '../lib/homeShelves';
import {
  budgetFacet,
  cityFacet,
  countryFacet,
  deadlineFacet,
  eligibleFacet,
  type Facet,
  fundingFacet,
  levelFacet,
  modeFacet,
  regionFacet,
  rewardFacet,
  SORT_NAMES,
  type SortKey,
  DEFAULT_SORT,
  justAdded,
  sortKeyOf,
  sortedBy,
  sourceFacet,
  topicFacet,
  typeFacet,
  viewFacet,
} from '../lib/filters';
import { setSearchParams } from '../lib/router';
import type { Listing } from '../lib/types';
import { EVENT_VIEWS, OPPORTUNITY_VIEWS } from '../lib/views';
import { ListingCard, priceKnown } from '../components/ListingCard';
import { ListingRow } from '../components/ListingRow';
import { Select } from '../components/Select';
import { POPULAR_SIZE } from '../lib/config';
import { distinctFamilies } from '../lib/families';
import {
  FeedBody,
  FilterLine,
  MoreFilters,
  PhoneFilterBar,
  Tally,
} from './FeedLayout';
import { useFacetFilters } from './useFacetFilters';

const EVENT_SORTS: SortKey[] = ['popular', 'soonest', 'recent', 'title'];
const OPPORTUNITY_SORTS: SortKey[] = [
  'popular',
  'soonest',
  'reward',
  'recent',
  'title',
];

/** The facets on the filter line itself; the rest sit under Filters. */
const ON_THE_LINE = new Set(['type', 'city']);

function facetsFor(kind: Listing['kind']): Facet[] {
  const where = [topicFacet, regionFacet, countryFacet, sourceFacet];
  if (kind === 'event') {
    return [
      typeFacet,
      cityFacet,
      viewFacet('When', EVENT_VIEWS),
      modeFacet,
      budgetFacet((l) => l.kind === 'event' && priceKnown(l)),
      ...where,
    ];
  }
  return [
    typeFacet,
    cityFacet,
    viewFacet('Closing', OPPORTUNITY_VIEWS),
    deadlineFacet,
    rewardFacet,
    fundingFacet,
    levelFacet,
    modeFacet,
    eligibleFacet,
    ...where,
  ];
}

/**
 * Events and Opportunities. Type and City sit on the filter line;
 * everything else, the order included, lives under Filters. Each menu counts
 * its options against the other filters that are set. With nothing picked
 * the page opens on a rail of cards and the time groups.
 */
export function FeedScreen({ kind }: { kind: Listing['kind'] }) {
  const event = kind === 'event';
  const views = event ? EVENT_VIEWS : OPPORTUNITY_VIEWS;
  const sorts = event ? EVENT_SORTS : OPPORTUNITY_SORTS;
  const all = useMemo(() => feed(kind), [kind]);
  const facets = facetsFor(kind);
  const {
    query,
    pick,
    menu,
    chip,
    items: matched,
    active,
    lineFacets,
    panelFacets,
    panelActive,
    cleared,
  } = useFacetFilters(all, facets, ON_THE_LINE);
  const sort = sortKeyOf(query.get('sort'), sorts);
  const items = sortedBy(matched, sort);
  const isFiltered = active.length > 0 || sort !== DEFAULT_SORT;
  const popular = distinctFamilies(items, [], POPULAR_SIZE);
  const concerts = items.filter(
    (l) => l.kind === 'event' && l.category === CONCERT_CATEGORY,
  );
  const sortMenu = (className?: string) => (
    <Select
      label="Order"
      value={sort}
      onChange={(s) => pick('sort', s === DEFAULT_SORT ? null : s)}
      options={sorts.map((s) => ({ value: s, label: SORT_NAMES[s] }))}
      className={className}
    />
  );
  const noun: [string, string] = event
    ? ['event', 'events']
    : ['opportunity', 'opportunities'];
  const clear = isFiltered
    ? () =>
        setSearchParams({
          ...cleared,
          sort: null,
          page: null,
        })
    : undefined;

  return (
    <div className="page pt-0 md:pt-14">
      <h1 className="sr-only md:hidden">
        {event ? 'Events' : 'Opportunities'}
      </h1>
      <PhoneFilterBar
        summary={<Tally compact count={items.length} noun={noun} />}
        sort={sortMenu('h-10 bg-transparent px-2 text-[15px]')}
        onClear={clear}
      >
        {facets.map(chip)}
      </PhoneFilterBar>
      <FilterLine
        summary={<Tally count={items.length} noun={noun} />}
        onClear={clear}
      >
        {lineFacets.map(menu)}
        <MoreFilters active={panelActive + Number(sort !== DEFAULT_SORT)}>
          {sortMenu()}
          {panelFacets.map(menu)}
        </MoreFilters>
      </FilterLine>
      <FeedBody
        items={items}
        views={views}
        filtered={isFiltered}
        noun={noun}
        keyOf={(l) => l.id}
        row={(l) => <ListingRow listing={l} />}
        rails={[
          { title: 'Popular', items: popular },
          { title: 'Concerts', items: concerts },
          {
            title: 'Just Added',
            items: justAdded(items).slice(0, POPULAR_SIZE),
          },
        ]}
        card={(l) => <ListingCard key={l.id} listing={l} />}
      />
    </div>
  );
}
