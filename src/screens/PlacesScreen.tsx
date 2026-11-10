import { useMemo, useState } from 'react';
import { places } from '../lib/api';
import { isFreeEntry, openStateNow } from '../lib/hours';
import { cityStore } from '../lib/preferences';
import { setSearchParams, useSearchParam } from '../lib/router';
import { useStore } from '../lib/store';
import { slugify } from '../lib/text';
import { PLACE_VIEWS, findView } from '../lib/views';
import { countBy, FeedPicker } from '../components/FeedPicker';
import { PlaceRow } from '../components/PlaceRow';
import { Select } from '../components/Select';
import { PlaceCard } from '../components/PlaceCard';
import { FeedBody, FilterLine, MoreFilters } from './FeedLayout';

type Entry = 'any' | 'free';

/**
 * Places: open ones first, then by name. Type and City on the filter line
 * (City starts on the reader's own city); Open and Entry under Filters.
 */
export function PlacesScreen() {
  const viewId = useSearchParam('view');
  const typeSlug = useSearchParam('type');
  const home = useStore(cityStore);
  const [city, setCity] = useState(home);
  const [entry, setEntry] = useState<Entry>('any');
  const all = useMemo(
    () =>
      [...places()].sort(
        (a, b) =>
          Number(openStateNow(b).open) - Number(openStateNow(a).open) ||
          a.name.localeCompare(b.name),
      ),
    [],
  );
  const view = findView(PLACE_VIEWS, viewId);
  const items = all.filter(
    (p) =>
      (!view || view.test(p)) &&
      (!typeSlug || slugify(p.type) === typeSlug) &&
      (city === 'all' || p.city === city) &&
      (entry === 'any' || isFreeEntry(p)),
  );
  const cities = [...new Set(all.map((p) => p.city))];
  const filtered = Boolean(
    view || typeSlug || entry !== 'any' || (city !== 'all' && city !== home),
  );
  const types = countBy(all, (p) => p.type);
  return (
    <div className="page pt-6 md:pt-14">
      <div className="md:hidden">
        <FeedPicker
          title="Places"
          sheetTitle="Place types"
          typeLabel="Types"
          views={PLACE_VIEWS.map((v) => ({
            value: v.id,
            label: v.label,
            count: all.filter(v.test).length,
          })).filter((v) => v.count)}
          types={types}
          view={view ? view.id : null}
          type={typeSlug}
          total={all.length}
        />
      </div>
      <FilterLine
        count={items.length}
        noun={['place', 'places']}
        onClear={
          filtered
            ? () => {
                setSearchParams({ view: null, type: null, page: null });
                setEntry('any');
                setCity(home);
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
            ...cities.map((c) => ({ value: c, label: c })),
          ]}
        />
        <MoreFilters active={Number(Boolean(view)) + Number(entry !== 'any')}>
          <Select
            label="Open"
            value={view?.id ?? 'all'}
            onChange={(v) => setSearchParams({ view: v, page: null })}
            options={[
              { value: 'all', label: 'Any time' },
              ...PLACE_VIEWS.map((v) => ({ value: v.id, label: v.label })),
            ]}
          />
          <Select
            label="Entry"
            value={entry}
            onChange={setEntry}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'free', label: 'Free' },
            ]}
          />
        </MoreFilters>
      </FilterLine>
      <FeedBody
        items={items}
        views={PLACE_VIEWS}
        filtered={filtered}
        noun={['place', 'places']}
        keyOf={(p) => p.id}
        row={(p) => <PlaceRow place={p} />}
        rail={{ title: 'Trending Places', items: items.slice(0, 8) }}
        card={(p) => <PlaceCard key={p.id} place={p} />}
      />
    </div>
  );
}
