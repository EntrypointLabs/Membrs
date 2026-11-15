import { useMemo } from 'react';
import { feed, launchCities } from '../lib/api';
import { bySoonest } from '../lib/dates';
import { setSearchParams, useSearchParam } from '../lib/router';
import { slugify } from '../lib/text';
import type { Listing } from '../lib/types';
import { EVENT_VIEWS, OPPORTUNITY_VIEWS, findView } from '../lib/views';
import { countBy, FeedPicker } from '../components/FeedPicker';
import { ListingCard, shownPrice } from '../components/ListingCard';
import { ListingRow } from '../components/ListingRow';
import { Select } from '../components/Select';
import { TitleBar } from '../components/TitleBar';
import { FeedBody, FilterLine, MoreFilters } from './FeedLayout';

type Budget = 'any' | 'free' | 'paid';
const BUDGETS: readonly Budget[] = ['any', 'free', 'paid'];
const REMOTE = 'Remote';

function budgetOf(listing: Listing): Budget {
  if (listing.kind !== 'event') return 'any';
  if (listing.free) return 'free';
  return shownPrice(listing) ? 'paid' : 'any';
}

/**
 * Events and Opportunities. Type and City sit on the one filter line (City
 * starts on All); When and Budget live under Filters. With
 * nothing else picked the page opens on a rail of cards and the time groups.
 */
export function FeedScreen({ kind }: { kind: Listing['kind'] }) {
  const event = kind === 'event';
  const views = event ? EVENT_VIEWS : OPPORTUNITY_VIEWS;
  const viewId = useSearchParam('view');
  const all = useMemo(() => [...feed(kind)].sort(bySoonest), [kind]);
  const types = countBy(all, (l) => l.category);
  const cities = [
    ...launchCities()
      .filter((c) => c.status === 'live')
      .map((c) => c.name),
    REMOTE,
  ];
  const typeParam = useSearchParam('type');
  const typeSlug = types.some((t) => t.value === typeParam) ? typeParam : null;
  const cityParam = useSearchParam('city');
  const city = cityParam && cities.includes(cityParam) ? cityParam : 'all';
  const budgetParam = useSearchParam('budget');
  const budget: Budget =
    event && BUDGETS.includes(budgetParam as Budget)
      ? (budgetParam as Budget)
      : 'any';
  const setCity = (c: string) => setSearchParams({ city: c, page: null });
  const setBudget = (b: Budget) =>
    setSearchParams({ budget: b === 'any' ? null : b, page: null });

  const view = findView(views, viewId);
  const items = all.filter(
    (l) =>
      (!view || view.test(l)) &&
      (!typeSlug || slugify(l.category) === typeSlug) &&
      (city === 'all' || l.city === city) &&
      (budget === 'any' || budgetOf(l) === budget),
  );
  const filtered = Boolean(
    view || typeSlug || budget !== 'any' || city !== 'all',
  );
  const rail = [...items]
    .filter((l) =>
      l.kind === 'event' ? l.inDays <= 3 : l.daysLeft >= 0 && l.daysLeft <= 31,
    )
    .sort(bySoonest);

  const cityFilter = (
    <Select
      label="City"
      value={city}
      onChange={setCity}
      options={[
        { value: 'all', label: 'All' },
        ...cities.map((c) => ({ value: c, label: c })),
      ]}
    />
  );
  const budgetFilter = event && (
    <Select
      label="Budget"
      value={budget}
      onChange={setBudget}
      options={[
        { value: 'any', label: 'Any' },
        { value: 'free', label: 'Free' },
        { value: 'paid', label: 'Paid' },
      ]}
    />
  );

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
          types={types}
          view={view ? view.id : null}
          type={typeSlug}
          total={all.length}
          filters={
            <>
              {cityFilter}
              {budgetFilter}
            </>
          }
        />
      </TitleBar>
      <FilterLine
        count={items.length}
        noun={event ? ['event', 'events'] : ['opportunity', 'opportunities']}
        onClear={
          filtered
            ? () => {
                setSearchParams({
                  view: null,
                  type: null,
                  city: null,
                  budget: null,
                  page: null,
                });
              }
            : undefined
        }
      >
        <Select
          label="Type"
          value={typeSlug ?? 'all'}
          onChange={(t) => setSearchParams({ type: t, page: null })}
          options={[
            { value: 'all', label: 'All' },
            ...types.map((t) => ({ value: t.value, label: t.label })),
          ]}
        />
        {cityFilter}
        <MoreFilters active={Number(Boolean(view)) + Number(budget !== 'any')}>
          <Select
            label={event ? 'When' : 'Closing'}
            value={view?.id ?? 'all'}
            onChange={(v) => setSearchParams({ view: v, page: null })}
            options={[
              { value: 'all', label: 'Any time' },
              ...views.map((v) => ({ value: v.id, label: v.label })),
            ]}
          />
          {budgetFilter}
        </MoreFilters>
      </FilterLine>
      <FeedBody
        items={items}
        views={views}
        filtered={filtered}
        noun={event ? ['event', 'events'] : ['opportunity', 'opportunities']}
        keyOf={(l) => l.id}
        row={(l) => <ListingRow listing={l} />}
        rail={{ title: event ? 'Happening Soon' : 'Closing Soon', items: rail }}
        card={(l) => <ListingCard key={l.id} listing={l} />}
      />
    </div>
  );
}
