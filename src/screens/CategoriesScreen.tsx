import {
  categories,
  listingsInCategory,
  places as allPlaces,
  taxonomy,
} from '../lib/api';
import { paths, type FeedKind } from '../lib/router';
import { plural, slugify, titleCase } from '../lib/text';
import { CategoryLabel } from '../components/CategoryLabel';
import { Link } from '../components/Link';
import { ListingCard } from '../components/ListingCard';
import { Photo } from '../components/Photo';

/** Big photo tiles, one per category, with the name and a count on the photo. */
export function CategoryTiles({
  kind,
  limit,
}: {
  kind: 'event' | 'opportunity';
  limit?: number;
}) {
  const list = categories()
    .filter((c) => c.kind === kind)
    .slice(0, limit);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
      {list.map((c) => (
        <Link
          key={c.slug}
          href={`${paths.feed(kind === 'event' ? 'events' : 'opportunities')}?type=${c.slug}`}
          className="group relative block overflow-hidden rounded-lg"
        >
          <Photo
            size="tile"
            id={c.photo}
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
export function CategoriesScreen({ feed }: { feed: FeedKind }) {
  const title = {
    events: 'Event categories',
    opportunities: 'Opportunity types',
    places: 'Place types',
    promos: 'Promo categories',
  }[feed];
  return (
    <div className="page pt-8 md:pt-16">
      <h1 className="mb-10 text-4xl font-semibold tracking-tight md:text-6xl">
        {titleCase(title)}
      </h1>
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
    <ul className="border-line border-t">
      {names.map((n) => (
        <li key={n} className="border-line border-b">
          <Link
            href={`${paths.feed(feed)}?type=${slugify(n)}`}
            className="hover:text-accent flex items-baseline justify-between gap-6 py-6 text-2xl font-semibold"
          >
            <CategoryLabel name={n} dot />
            <span className="text-fg-3 text-base font-normal">
              {feed === 'places'
                ? `${allPlaces().filter((p) => p.type === n).length} places · ${t.placeTypeBlurbs[n] ?? ''}`
                : ''}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** One category: its blurb and everything in it, soonest first. */
export function CategoryScreen({ slug }: { slug: string }) {
  const category = categories().find((c) => c.slug === slug);
  if (!category) return null;
  const items = listingsInCategory(category.name);
  return (
    <div className="page pt-8 md:pt-16">
      <CategoryLabel
        name={category.kind === 'event' ? 'Events' : 'Opportunities'}
        className="text-sm font-semibold uppercase"
      />
      <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-6xl">
        {category.name}
      </h1>
      <p className="text-fg-2 mt-4 max-w-xl text-lg">{category.blurb}</p>
      <p className="text-fg-3 mt-2">{plural(items.length, 'listing')}</p>
      <div className="mt-10 grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 md:grid-cols-3">
        {items.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}
