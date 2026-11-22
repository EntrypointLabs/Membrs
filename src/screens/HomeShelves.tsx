import { Fragment, useCallback, useState } from 'react';
import { attendable, readerCountryStore } from '../lib/api';
import { readerPlaceOf } from '../lib/africa';
import { cityStore } from '../lib/preferences';
import {
  homeShelves,
  type HomeShelf,
  type ShelfInputs,
} from '../lib/homeShelves';
import { nearbyStore, positionStore } from '../lib/location';
import { useStore } from '../lib/store';
import type { Listing } from '../lib/types';
import { viewedStore } from '../lib/viewed';
import { ListingCard } from '../components/ListingCard';
import { PagedGrid } from '../components/PagedGrid';
import { PhoneList } from '../components/PhoneList';
import { ScrollMore } from '../components/ScrollMore';
import { SectionHeader } from '../components/SectionHeader';
import { Tabs } from '../components/Tabs';

const SHELVES_AT_ONCE = 3;

export function useShelfInputs(shown: Listing[]): ShelfInputs {
  const nearby = useStore(nearbyStore);
  const position = useStore(positionStore);
  const viewed = useStore(viewedStore);
  const city = useStore(cityStore);
  const country = useStore(readerCountryStore);
  return {
    pool: attendable(),
    nearby,
    picked: readerPlaceOf(city, country),
    position,
    viewed: Array.isArray(viewed) ? viewed : [],
    shown,
  };
}

export function LocalShelves({ shelves }: { shelves: HomeShelf[] }) {
  return (
    <>
      {shelves.map((shelf) => (
        <Fragment key={shelf.id}>
          <PhoneList
            title={shelf.title}
            items={shelf.items}
            aside={shelf.about}
          />
          <Shelf shelf={shelf} aside className="max-md:hidden" />
        </Fragment>
      ))}
    </>
  );
}

export function HomeShelves({ shown }: { shown: Listing[] }) {
  const inputs = useShelfInputs(shown);
  const shelves = homeShelves(inputs);
  const [count, setCount] = useState(SHELVES_AT_ONCE);
  const loadMore = useCallback(
    () => setCount((more) => more + SHELVES_AT_ONCE),
    [],
  );
  return (
    <>
      {shelves.slice(0, count).map((shelf) => (
        <Shelf key={shelf.id} shelf={shelf} />
      ))}
      <ScrollMore more={count < shelves.length ? loadMore : null} />
    </>
  );
}

const ALL_CATEGORIES = 'All';
const MOST_CATEGORY_TABS = 6;

/** The categories with the most listings on a shelf, biggest first, after All. */
export function categoryTabs(items: Listing[]): string[] {
  const counts = new Map<string, number>();
  for (const l of items)
    counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
  const biggest = [...counts]
    .filter(([category]) => category)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MOST_CATEGORY_TABS)
    .map(([category]) => category);
  return [ALL_CATEGORIES, ...biggest];
}

/**
 * One shelf as a grid of cards. With aside, the shelf's place sits on the
 * right of the heading next to any tabs rather than under the title.
 */
function Shelf({
  shelf,
  aside = false,
  className = '',
}: {
  shelf: HomeShelf;
  aside?: boolean;
  className?: string;
}) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const tabs = shelf.distances ? categoryTabs(shelf.items) : [];
  const items =
    category === ALL_CATEGORIES
      ? shelf.items
      : shelf.items.filter((l) => l.category === category);
  return (
    <section className={`mt-12 md:mt-[clamp(140px,11vw,200px)] ${className}`}>
      <SectionHeader
        title={shelf.title}
        body={aside ? undefined : shelf.about}
        count={items.length}
        actions={
          (aside && shelf.about) || tabs.length > 2 ? (
            <>
              {aside && shelf.about && (
                <span className="text-fg-3 text-base">{shelf.about}</span>
              )}
              {tabs.length > 2 && (
                <Tabs
                  label="Category"
                  value={category}
                  onChange={(c) => {
                    setCategory(c);
                    setPage(1);
                  }}
                  options={tabs.map((c) => ({ value: c, label: c }))}
                />
              )}
            </>
          ) : undefined
        }
      />
      <PagedGrid
        items={items}
        page={page}
        onPage={setPage}
        render={(l) => <ListingCard key={l.id} listing={l} mixed />}
      />
    </section>
  );
}
