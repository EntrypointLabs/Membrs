import { useMemo, useState } from 'react';
import { places } from '../lib/api';
import { isFreeEntry, openStateNow } from '../lib/hours';
import { useSearchParam } from '../lib/router';
import { slugify } from '../lib/text';
import { PLACE_VIEWS, findView } from '../lib/views';
import { countBy, FeedPicker } from '../components/FeedPicker';
import { PlaceRow } from '../components/PlaceRow';
import { Select } from '../components/Select';
import { FeedBody, FeedHeader, FilterRow } from './FeedLayout';

type Entry = 'any' | 'free';

/** Places: open ones first, then by name. */
export function PlacesScreen() {
  const viewId = useSearchParam('view');
  const typeSlug = useSearchParam('type');
  const [city, setCity] = useState('all');
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
  return (
    <div className="page pt-6 md:pt-14">
      <FeedHeader>
        <FeedPicker
          title="Places"
          sheetTitle="Place types"
          typeLabel="Types"
          views={PLACE_VIEWS.map((v) => ({
            value: v.id,
            label: v.label,
            count: all.filter(v.test).length,
          })).filter((v) => v.count)}
          types={countBy(all, (p) => p.type)}
          view={view ? view.id : null}
          type={typeSlug}
          total={all.length}
        />
        <FilterRow>
          <Select
            label="City"
            value={city}
            onChange={setCity}
            options={[
              { value: 'all', label: 'All' },
              ...cities.map((c) => ({ value: c, label: c })),
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
        </FilterRow>
      </FeedHeader>
      <FeedBody
        items={items}
        views={PLACE_VIEWS}
        filtered={Boolean(
          view || typeSlug || city !== 'all' || entry !== 'any',
        )}
        noun={['place', 'places']}
        keyOf={(p) => p.id}
        row={(p) => <PlaceRow place={p} />}
      />
    </div>
  );
}
