import { useMemo } from 'react';
import { promos } from '../lib/api';
import { useSearchParam } from '../lib/router';
import { slugify } from '../lib/text';
import { PROMO_VIEWS, findView } from '../lib/views';
import { countBy, FeedPicker } from '../components/FeedPicker';
import { PromoCard } from '../components/PromoCard';
import { FeedBody } from './FeedLayout';

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
  return (
    <div className="page pt-6 md:pt-14">
      <FeedPicker
        title="Promos"
        sheetTitle="Promo categories"
        typeLabel="Categories"
        views={PROMO_VIEWS.map((v) => ({
          value: v.id,
          label: v.label,
          count: all.filter(v.test).length,
        })).filter((v) => v.count)}
        types={countBy(all, (p) => p.category)}
        view={view ? view.id : null}
        type={typeSlug}
        total={all.length}
      />
      <FeedBody
        items={items}
        views={PROMO_VIEWS}
        filtered={Boolean(view || typeSlug)}
        noun={['promo', 'promos']}
        keyOf={(p) => p.id}
        grid
        row={(p) => <PromoCard promo={p} />}
      />
    </div>
  );
}
