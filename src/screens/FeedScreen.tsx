import { useMemo, useState } from 'react';
import { feed, launchCities } from '../lib/api';
import { useSearchParam } from '../lib/router';
import { slugify } from '../lib/text';
import type { Listing } from '../lib/types';
import { EVENT_VIEWS, OPPORTUNITY_VIEWS, findView } from '../lib/views';
import { countBy, FeedPicker } from '../components/FeedPicker';
import { ListingRow } from '../components/ListingRow';
import { Select } from '../components/Select';
import { FeedBody, FeedHeader, FilterRow } from './FeedLayout';

type Budget = 'any' | 'free' | 'paid';

/**
 * Events and Opportunities. The title picker chooses a time view or a
 * category (both in the URL); city and budget are extra filters on the right.
 */
export function FeedScreen({ kind }: { kind: Listing['kind'] }) {
  const event = kind === 'event';
  const views = event ? EVENT_VIEWS : OPPORTUNITY_VIEWS;
  const viewId = useSearchParam('view');
  const typeSlug = useSearchParam('type');
  const [city, setCity] = useState('all');
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

  return (
    <div className="page pt-6 md:pt-14">
      <FeedHeader>
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
          types={countBy(all, (l) => l.category)}
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
              ...launchCities().map((c) => ({ value: c.name, label: c.name })),
              { value: 'Remote', label: 'Remote' },
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
        </FilterRow>
      </FeedHeader>
      <FeedBody
        items={items}
        views={views}
        filtered={Boolean(
          view || typeSlug || city !== 'all' || budget !== 'any',
        )}
        noun={event ? ['event', 'events'] : ['opportunity', 'opportunities']}
        keyOf={(l) => l.id}
        row={(l) => <ListingRow listing={l} />}
      />
    </div>
  );
}
