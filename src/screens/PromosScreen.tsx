import { useMemo } from 'react';
import { promos } from '../lib/api';
import { setSearchParams, useSearchParam } from '../lib/router';
import { slugify } from '../lib/text';
import { PROMO_VIEWS, findView } from '../lib/views';
import { countBy, FeedPicker } from '../components/FeedPicker';
import { PromoCard } from '../components/PromoCard';
import { PromoRow } from '../components/PromoRow';
import { Select } from '../components/Select';
import { FeedBody, FilterLine, MoreFilters } from './FeedLayout';

/** Promos, ending soonest first. */
export function PromosScreen() {
  const viewId = useSearchParam('view');
  const typeSlug = useSearchParam('type');
  const all = useMemo(
    () =>
      [...promos()].sort(
        (a, b) =>
          a.startsInDays - b.startsInDays || a.endsInDays - b.endsInDays,
      ),
    [],
  );
  const view = findView(PROMO_VIEWS, viewId);
  const items = all.filter(
    (p) =>
      (!view || view.test(p)) &&
      (!typeSlug || slugify(p.category) === typeSlug),
  );
  const types = countBy(all, (p) => p.category);
  const filtered = Boolean(view || typeSlug);
  const ending = items.filter((p) => !p.startsInDays).slice(0, 5);
  return (
    <div className="page pt-6 md:pt-14">
      <div className="md:hidden">
        <FeedPicker
          title="Promos"
          sheetTitle="Promo categories"
          typeLabel="Categories"
          views={PROMO_VIEWS.map((v) => ({
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
        noun={['promo', 'promos']}
        onClear={
          filtered
            ? () => setSearchParams({ view: null, type: null, page: null })
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
        <MoreFilters active={Number(Boolean(view))}>
          <Select
            label="Ends"
            value={view?.id ?? 'all'}
            onChange={(v) => setSearchParams({ view: v, page: null })}
            options={[
              { value: 'all', label: 'Any time' },
              ...PROMO_VIEWS.map((v) => ({ value: v.id, label: v.label })),
            ]}
          />
        </MoreFilters>
      </FilterLine>
      <FeedBody
        items={items}
        views={PROMO_VIEWS}
        filtered={filtered}
        noun={['promo', 'promos']}
        keyOf={(p) => p.id}
        row={(p) => <PromoRow promo={p} />}
        rail={{ title: 'Ending Soon', items: ending }}
        card={(p) => <PromoCard key={p.id} promo={p} />}
      />
    </div>
  );
}
