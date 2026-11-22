import {
  categories,
  listings,
  places as allPlaces,
  taxonomy,
} from '../lib/api';
import { area, track } from '../lib/analytics';
import { byPopularity } from '../lib/dates';
import { paths, useSearchParam, type FeedKind } from '../lib/router';
import { EVENT_VIEWS, findView, OPPORTUNITY_VIEWS } from '../lib/views';
import { plural, slugify, titleCase } from '../lib/text';
import { CategoryLabel } from '../components/CategoryLabel';
import { Link } from '../components/Link';
import { Photo } from '../components/Photo';
import { FeedPicker, viewOptions } from '../components/FeedPicker';
import { PageTitle } from '../components/PageTitle';
import { TitleBar } from '../components/TitleBar';
import { ListingResults } from './FeedLayout';
import { NotFoundScreen } from './NotFoundScreen';

/** Big photo tiles, one per category, with the name and a count on the photo. */
export function CategoryTiles({
  kind,
  limit,
}: {
  kind: 'event' | 'opportunity';
  limit?: number;
}) {
  const all = categories().filter((c) => c.kind === kind);
  const list = limit
    ? [...all].sort((a, b) => b.count - a.count).slice(0, limit)
    : all;
  return (
    <div
      className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6"
      {...area('category_tiles')}
    >
      {list.map((c) => (
        <Link
          key={c.slug}
          href={paths.category(c.slug)}
          onClick={(e) =>
            track(
              'category_clicked',
              {
                category: c.name,
                section: kind === 'event' ? 'events' : 'opportunities',
              },
              e.currentTarget,
            )
          }
          className="group rounded-photo relative block overflow-hidden"
        >
          <Photo
            size="tile"
            id={c.photo}
            src={c.coverUrl}
            alt=""
            className="aspect-square transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <span className="absolute inset-x-4 bottom-4 text-white">
            <span className="block text-xl font-semibold md:text-2xl">
              {c.name}
            </span>
            <span className="text-sm text-white/80">
              {plural(c.count, kind === 'event' ? 'event' : 'opening')}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** /events/categories and friends: every category for one section. */
const SECTION_NAMES: Record<FeedKind, [string, string]> = {
  events: ['Events', 'Categories'],
  opportunities: ['Opportunities', 'Types'],
  places: ['Places', 'Types'],
  promos: ['Promos', 'Categories'],
};

export function CategoriesScreen({ feed }: { feed: FeedKind }) {
  const [section, current] = SECTION_NAMES[feed];
  return (
    <div className="page pt-0 md:pt-16">
      <TitleBar desktop className="mb-6 md:mb-0">
        <PageTitle
          section={section}
          sectionHref={paths.feed(feed)}
          current={current}
        />
      </TitleBar>
      {feed === 'events' || feed === 'opportunities' ? (
        <CategoryTiles kind={feed === 'events' ? 'event' : 'opportunity'} />
      ) : (
        <TypeList feed={feed} />
      )}
    </div>
  );
}

function TypeList({ feed }: { feed: 'places' | 'promos' }) {
  const t = taxonomy();
  const names = feed === 'places' ? t.placeTypes : t.promoCategories;
  return (
    <ul className="border-line border-t" {...area('type_list')}>
      {names.map((n) => (
        <li key={n} className="border-line border-b">
          <Link
            href={`${paths.feed(feed)}?type=${slugify(n)}`}
            onClick={(e) =>
              track(
                'category_clicked',
                { category: n, section: feed },
                e.currentTarget,
              )
            }
            className="hover:text-accent flex items-baseline justify-between gap-6 py-6 text-2xl font-semibold"
          >
            <CategoryLabel name={n} dot />
            <span className="text-fg-3 text-base font-normal">
              {feed === 'places'
                ? plural(
                    allPlaces().filter((p) => p.type === n).length,
                    'place',
                  )
                : ''}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoryScreen({ slug }: { slug: string }) {
  const known = categories().find((c) => c.slug === slug);
  const all = listings()
    .filter((l) => slugify(l.category) === slug || l.category === known?.name)
    .sort(byPopularity);
  const events = all.filter((l) => l.kind === 'event').length;
  const kind =
    known?.kind ?? (events * 2 >= all.length ? 'event' : 'opportunity');
  const views = kind === 'event' ? EVENT_VIEWS : OPPORTUNITY_VIEWS;
  const view = findView(views, useSearchParam('view'));
  const items = view ? all.filter(view.test) : all;
  const name = known?.name ?? all[0]?.category;
  if (!name) return <NotFoundScreen />;
  return (
    <div className="page pt-0 md:pt-16">
      <TitleBar desktop>
        <FeedPicker
          title={kind === 'event' ? 'Events' : 'Opportunities'}
          placeholder={titleCase(name)}
          allLabel={`All ${titleCase(name)}`}
          sheetTitle={titleCase(name)}
          typeLabel="Categories"
          views={viewOptions(views, all)}
          types={[]}
          view={view ? view.id : null}
          type={null}
          total={all.length}
        />
      </TitleBar>
      <div {...area('category_listings')}>
        <ListingResults items={items} />
      </div>
    </div>
  );
}
