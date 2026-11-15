import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useIsPhone } from '../lib/media';
import { DesktopTilesProvider } from '../lib/rowLayout';
import { setSearchParams, useSearchParam } from '../lib/router';
import { plural } from '../lib/text';
import type { Listing } from '../lib/types';
import { groupByView, type View } from '../lib/views';
import { HeadingCount } from '../components/HeadingCount';
import { Icon } from '../components/Icon';
import { ListingCard } from '../components/ListingCard';
import { ListingRow } from '../components/ListingRow';
import { clampPage, Pager, pageOf } from '../components/Pager';
import { Rail } from '../components/Rail';

/** Rows a page on a flat, filtered list. */
const LIST_PAGE = 12;
/** Cards a page in the lead rail on web: three by two. */
const RAIL_PAGE = 6;
const GROUP_MAX = 9;

interface FeedBodyProps<T> {
  items: T[];
  views: View<T>[];
  /** Whether anything beyond the reader's own city is picked. */
  filtered: boolean;
  noun: [string, string];
  row: (item: T) => ReactNode;
  keyOf: (item: T) => string;
  /** The lead rail of cards: "Happening Soon", "Closing Soon". */
  rail: { title: string; items: T[] };
  card: (item: T) => ReactNode;
}

/**
 * The body every section shares, on web and phones alike. With nothing
 * picked: a rail of cards, then the time groups, three to five rows each with
 * "N more ›" into that view. With a view, type or filter picked: the flat,
 * paged list, so every "more" page looks the same.
 */
export function FeedBody<T>({
  items,
  views,
  filtered,
  noun,
  row,
  keyOf,
  rail,
  card,
}: FeedBodyProps<T>) {
  const paged = usePagedList(items);
  const [railPage, setRailPage] = useState(1);

  if (items.length === 0) return <Empty />;

  if (filtered) {
    return (
      <>
        <TileGrid>
          {paged.items.map((i) => (
            <div key={keyOf(i)}>{row(i)}</div>
          ))}
        </TileGrid>
        <PagedListPager paged={paged} total={items.length} noun={noun[1]} />
      </>
    );
  }

  const shown = groupByView(items, views);
  const railPages = Math.ceil(rail.items.length / RAIL_PAGE);

  return (
    <>
      {rail.items.length > 0 && (
        <section className="mt-2 md:mt-10">
          <GroupHeading title={rail.title} count={rail.items.length} />
          <div className="md:hidden">
            <Rail>{rail.items.slice(0, 10).map(card)}</Rail>
          </div>
          <div className="hidden md:block">
            <Rail>{pageOf(rail.items, railPage, RAIL_PAGE).map(card)}</Rail>
            <Pager
              page={railPage}
              pages={railPages}
              total={rail.items.length}
              noun={noun[1]}
              onChange={setRailPage}
            />
          </div>
        </section>
      )}
      {shown.map(({ view, items: group }) => {
        const extra = group.length - GROUP_MAX;
        return (
          <section key={view.id} className="mt-10 md:mt-16">
            <GroupHeading
              title={view.label}
              count={group.length}
              more={
                extra > 0
                  ? {
                      label: String(extra),
                      aria: `${extra} more ${extra === 1 ? noun[0] : noun[1]}`,
                      onClick: () => {
                        setSearchParams({
                          view: view.id,
                          type: null,
                          page: null,
                        });
                        window.scrollTo({ top: 0 });
                      },
                    }
                  : undefined
              }
            />
            <TileGrid>
              {group.slice(0, GROUP_MAX).map((i) => (
                <div key={keyOf(i)}>{row(i)}</div>
              ))}
            </TileGrid>
          </section>
        );
      })}
    </>
  );
}

interface PagedList<T> {
  page: number;
  pages: number;
  items: T[];
  phone: boolean;
  more: (() => void) | null;
}

/**
 * Numbered pages on web. Phones scroll instead: the list grows by a page each
 * time its end comes into view, and starts over when the list itself changes.
 */
export function usePagedList<T>(items: T[], size = LIST_PAGE): PagedList<T> {
  const phone = useIsPhone();
  const pages = Math.ceil(items.length / size);
  const page = clampPage(useSearchParam('page'), pages);
  const first = items[0] as { id?: string } | undefined;
  const identity = `${items.length}:${first?.id ?? ''}:${size}`;
  const [loaded, setLoaded] = useState({ identity, count: size });
  const count = loaded.identity === identity ? loaded.count : size;
  if (!phone)
    return { page, pages, items: pageOf(items, page, size), phone, more: null };
  const more =
    count < items.length
      ? () => setLoaded({ identity, count: count + size })
      : null;
  return { page: 1, pages, items: items.slice(0, count), phone, more };
}

export function PagedListPager<T>({
  paged,
  total,
  noun,
}: {
  paged: PagedList<T>;
  total: number;
  noun: string;
}) {
  if (paged.phone) return <ScrollMore more={paged.more} />;
  return (
    <Pager
      page={paged.page}
      pages={paged.pages}
      total={total}
      noun={noun}
      onChange={(p) => setSearchParams({ page: String(p) })}
    />
  );
}

/**
 * A flat list of listings in the one shape every list page uses: rows on
 * phones that keep loading as you scroll, cards on wider screens with pages.
 */
export function ListingResults({
  items,
  empty,
}: {
  items: Listing[];
  empty?: string;
}) {
  const paged = usePagedList(items);
  if (items.length === 0) return <Empty>{empty}</Empty>;
  return (
    <>
      <div className="border-line border-t md:hidden">
        {paged.items.map((l) => (
          <ListingRow key={l.id} listing={l} />
        ))}
      </div>
      <div className="mt-10 hidden grid-cols-2 gap-x-8 gap-y-16 md:grid lg:grid-cols-3">
        {paged.items.map((l) => (
          <ListingCard key={l.id} listing={l} mixed />
        ))}
      </div>
      <PagedListPager paged={paged} total={items.length} noun="listings" />
    </>
  );
}

function ScrollMore({ more }: { more: (() => void) | null }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = end.current;
    if (!node || !more) return;
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) more();
      },
      { rootMargin: '600px 0px' },
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [more]);
  if (!more) return null;
  return (
    <div ref={end} className="grid place-items-center py-10" aria-hidden="true">
      <Icon name="loader" className="text-fg-3 h-5 w-5 animate-spin" />
    </div>
  );
}

function TileGrid({ children }: { children: ReactNode }) {
  return (
    <DesktopTilesProvider value={true}>
      <div className="md:mt-2 md:grid md:grid-cols-3 md:gap-x-10 md:gap-y-14 xl:gap-x-14">
        {children}
      </div>
    </DesktopTilesProvider>
  );
}

function GroupHeading({
  title,
  count,
  more,
}: {
  title: string;
  count?: number;
  more?: { label: string; aria: string; onClick: () => void };
}) {
  return (
    <header className="mb-2 flex items-baseline justify-between gap-4 md:mb-6">
      <h2 className="min-w-0 truncate text-[22px] font-semibold tracking-tight md:text-[44px]">
        {title}
        {count !== undefined && <HeadingCount count={count} />}
      </h2>
      {more && (
        <button
          type="button"
          onClick={more.onClick}
          aria-label={more.aria}
          className="text-fg-3 hover:text-fg flex shrink-0 items-center gap-0.5 text-[15px]"
        >
          {more.label} <Icon name="chevronRight" />
        </button>
      )}
    </header>
  );
}

export function Empty({
  children = 'Nothing here yet. New listings arrive every morning.',
}: {
  children?: string;
}) {
  return <p className="text-fg-3 py-20 text-center text-lg">{children}</p>;
}

/**
 * The one line of filters on web: the count, large, on the left, and the
 * controls on the right in no more than half the page. Phones filter from
 * the section title's sheet instead.
 */
export function FilterLine({
  count,
  noun,
  onClear,
  children,
}: {
  count: number;
  noun: [string, string];
  /** Shown when something beyond the reader's city is picked. */
  onClear?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="md:border-line hidden md:flex md:items-center md:justify-between md:gap-6 md:border-b md:pb-6">
      <p className="hidden items-baseline gap-2.5 md:flex">
        <b className="text-5xl leading-none font-bold tracking-tight tabular-nums">
          {count}
        </b>
        <span className="text-[22px] font-medium">
          {plural(count, noun[0], noun[1]).replace(/^\d+\s/, '')}
        </span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-fg-3 hover:text-fg ml-2 text-[15px]"
          >
            Clear filters
          </button>
        )}
      </p>
      <div className="flex max-w-[50%] flex-none justify-end gap-2">
        {children}
      </div>
    </div>
  );
}

/**
 * "Filters": the secondary filters (when, budget, entry) in one panel, so the
 * line itself only carries Type and City.
 */
export function MoreFilters({
  active,
  children,
}: {
  /** How many of the filters inside are set, shown as a badge. */
  active: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={box} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="bg-btn hover:bg-btn-hover flex h-10 items-center gap-2 rounded-md px-3.5 text-[15px] font-semibold whitespace-nowrap"
      >
        <Icon name="filter" className="h-4 w-4" />
        Filters
        {active > 0 && (
          <span className="bg-brand grid h-5 min-w-5 place-items-center rounded-sm px-1 text-xs text-white">
            {active}
          </span>
        )}
        <Icon name="chevronDown" className="text-fg-3 h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Filters"
          className="bg-panel border-line-2 absolute top-12 right-0 z-30 flex w-72 flex-col gap-2 rounded-lg border p-4 shadow-2xl max-md:fixed max-md:inset-x-4 max-md:top-auto max-md:bottom-24 max-md:w-auto [&_label]:w-full [&_label]:justify-between"
        >
          {children}
        </div>
      )}
    </div>
  );
}
