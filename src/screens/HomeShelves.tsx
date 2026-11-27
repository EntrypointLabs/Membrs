import { Fragment, useCallback, useState } from 'react';
import { area, context } from '../lib/analytics';
import { useSectionItems, type SectionPath } from '../lib/api';
import { PAGE_SIZE } from '../lib/config';
import type { Section } from '../lib/types';
import { ListingCard } from '../components/ListingCard';
import { PhoneList } from '../components/PhoneList';
import { ScrollMore } from '../components/ScrollMore';
import { SectionGrid } from '../components/SectionGrid';
import { SectionHeader } from '../components/SectionHeader';
import { Tabs } from '../components/Tabs';

const SHELVES_AT_ONCE = 3;
const ALL_CATEGORIES = 'All';
const PHONE_SHELF = 5;

export function LocalShelves({
  shelves,
  pathOf,
}: {
  shelves: Section[];
  pathOf: SectionPath;
}) {
  return (
    <>
      {shelves.map((shelf) => (
        <Fragment key={shelf.id}>
          <PhoneShelf shelf={shelf} pathOf={pathOf} />
          <Shelf
            shelf={shelf}
            pathOf={pathOf}
            aside
            className="max-md:hidden"
          />
        </Fragment>
      ))}
    </>
  );
}

export function HomeShelves({
  shelves,
  pathOf,
}: {
  shelves: Section[];
  pathOf: SectionPath;
}) {
  const [count, setCount] = useState(SHELVES_AT_ONCE);
  const loadMore = useCallback(
    () => setCount((more) => more + SHELVES_AT_ONCE),
    [],
  );
  return (
    <>
      {shelves.slice(0, count).map((shelf) => (
        <Fragment key={shelf.id}>
          <PhoneShelf shelf={shelf} pathOf={pathOf} />
          <Shelf shelf={shelf} pathOf={pathOf} className="max-md:hidden" />
        </Fragment>
      ))}
      <ScrollMore more={count < shelves.length ? loadMore : null} />
    </>
  );
}

function PhoneShelf({
  shelf,
  pathOf,
}: {
  shelf: Section;
  pathOf: SectionPath;
}) {
  const { items } = useSectionItems(shelf, 1, PHONE_SHELF, pathOf);
  return (
    <PhoneList
      title={shelf.title}
      items={items}
      count={shelf.total}
      aside={shelf.about}
      areaName="home_shelf"
    />
  );
}

function Shelf({
  shelf,
  pathOf,
  aside = false,
  className = '',
}: {
  shelf: Section;
  pathOf: SectionPath;
  aside?: boolean;
  className?: string;
}) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const tabs = shelf.tabs?.length ? [ALL_CATEGORIES, ...shelf.tabs] : [];
  const picked = category === ALL_CATEGORIES ? undefined : category;
  const { total } = useSectionItems(shelf, page, PAGE_SIZE, pathOf, picked);
  return (
    <section
      className={`mt-12 md:mt-[clamp(140px,11vw,200px)] ${className}`}
      {...area('home_shelf')}
      {...context({ shelf: shelf.id })}
    >
      <SectionHeader
        title={shelf.title}
        body={aside ? undefined : shelf.about}
        count={total}
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
      <SectionGrid
        section={shelf}
        pathOf={pathOf}
        page={page}
        onPage={setPage}
        category={picked}
        render={(l) => <ListingCard key={l.id} listing={l} mixed />}
      />
    </section>
  );
}
