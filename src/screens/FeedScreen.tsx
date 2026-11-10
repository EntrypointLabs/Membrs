import { useMemo, useState } from 'react';
import { feed, launchCities } from '../lib/api';
import { bySoonest } from '../lib/dates';
import { cityStore } from '../lib/preferences';
import { setSearchParams, useSearchParam } from '../lib/router';
import { useStore } from '../lib/store';
import { slugify } from '../lib/text';
import type { Listing } from '../lib/types';
import { EVENT_VIEWS, OPPORTUNITY_VIEWS, findView } from '../lib/views';
import { countBy, FeedPicker } from '../components/FeedPicker';
import { ListingCard } from '../components/ListingCard';
import { ListingRow } from '../components/ListingRow';
import { Select } from '../components/Select';
import { FeedBody, FilterLine, MoreFilters } from './FeedLayout';

type Budget = 'any' | 'free' | 'paid';

/**
 * Events and Opportunities. Type and City sit on the one filter line (City
 * starts on the reader's own city); When and Budget live under Filters. With
 * nothing else picked the page opens on a rail of cards and the time groups.
 */
export function FeedScreen({ kind }: { kind: Listing['kind'] }) {
  const event = kind === 'event';
  const views = event ? EVENT_VIEWS : OPPORTUNITY_VIEWS;
  const viewId = useSearchParam('view');
  const typeSlug = useSearchParam('type');
  const home = useStore(cityStore);
  const [city, setCity] = useState(event ? home : 'all');
  const [budget, setBudget] = useState<Budget>('any');

  const all = useMemo(() => feed(kind), [kind]);
  const view = findView(views, viewId);
  const items = all.filter(
    (l) =>
      (!view || view.test(l)) &&
      (!typeSlug || slugify(l.category) === typeSlug) &&
      (city === 'all' || l.city === city) &&
      (budget === 'any' ||
        (l.kind === 'event' && l.free === (budget === 'free'))),
  );
  const filtered = Boolean(
    view ||
    typeSlug ||
    budget !== 'any' ||
    (city !== 'all' && city !== (event ? home : 'all')),
  );
  const types = countBy(all, (l) => l.category);
  const rail = [...items]
    .filter((l) =>
      l.kind === 'event' ? l.inDays <= 3 : l.daysLeft >= 0 && l.daysLeft <= 31,
    )
    .sort(bySoonest);

  return (
    <div className="page pt-6 md:pt-14">
      <div className="md:hidden">
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
        />
      </div>
      <FilterLine
        count={items.length}
        noun={event ? ['event', 'events'] : ['opportunity', 'opportunities']}
        onClear={
          filtered
            ? () => {
                setSearchParams({ view: null, type: null, page: null });
                setBudget('any');
                setCity(event ? home : 'all');
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
        <Select
          label="City"
          value={city}
          onChange={setCity}
          options={[
            { value: 'all', label: 'All' },
            ...launchCities().map((c) => ({ value: c.name, label: c.name })),
            { value: 'Remote', label: 'Remote' },
          ]}
        />
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
          {event && (
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
          )}
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
