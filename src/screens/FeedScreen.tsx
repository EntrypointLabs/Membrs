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
  optionsOf,
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
import { EVENT_VIEWS, OPPORTUNITY_VIEWS, findView } from '../lib/views';
import { FeedPicker } from '../components/FeedPicker';
import { ListingCard, shownPrice } from '../components/ListingCard';
import { ListingRow } from '../components/ListingRow';
import { Select } from '../components/Select';
import { TitleBar } from '../components/TitleBar';
import { POPULAR_SIZE } from '../lib/config';
import { distinctFamilies } from '../lib/families';
import { FeedBody, FilterLine, MoreFilters, Tally } from './FeedLayout';
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
      budgetFacet((l) => l.kind === 'event' && Boolean(shownPrice(l))),
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
    picks,
    pick,
    menu,
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
  const view = findView(views, picks.view ?? null);
  const popular = distinctFamilies(items, [], POPULAR_SIZE);
  const concerts = items.filter(
    (l) => l.kind === 'event' && l.category === CONCERT_CATEGORY,
  );
  const sortMenu = (
    <Select
      label="Order"
      value={sort}
      onChange={(s) => pick('sort', s === DEFAULT_SORT ? null : s)}
      options={sorts.map((s) => ({ value: s, label: SORT_NAMES[s] }))}
    />
  );
  const typeOptions = optionsOf(typeFacet, all, facets, picks);

  return (
    <div className="page pt-0 md:pt-14">
      <TitleBar className="mb-3">
        <FeedPicker
          title={event ? 'Events' : 'Opportunities'}
          sheetTitle={event ? 'Event categories' : 'Opportunity types'}
          typeLabel={event ? 'Categories' : 'Types'}
          views={views
            .map((v) => ({
              value: v.id,
              label: v.label,
              count: all.filter(v.test).length,
            }))
            .filter((v) => v.count)}
          types={typeOptions}
          view={view ? view.id : null}
          type={picks.type ?? null}
          total={all.length}
          filters={
            <>
              {facets
                .filter((f) => f.param !== 'type' && f.param !== 'view')
                .map(menu)}
              {sortMenu}
            </>
          }
        />
      </TitleBar>
      <FilterLine
        summary={
          <Tally
            count={items.length}
            noun={
              event ? ['event', 'events'] : ['opportunity', 'opportunities']
            }
          />
        }
        onClear={
          isFiltered
            ? () =>
                setSearchParams({
                  ...cleared,
                  sort: null,
                  page: null,
                })
            : undefined
        }
      >
        {lineFacets.map(menu)}
        <MoreFilters active={panelActive + Number(sort !== DEFAULT_SORT)}>
          {sortMenu}
          {panelFacets.map(menu)}
        </MoreFilters>
      </FilterLine>
      <FeedBody
        items={items}
        views={views}
        filtered={isFiltered}
        noun={event ? ['event', 'events'] : ['opportunity', 'opportunities']}
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
