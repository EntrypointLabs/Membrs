import { useEffect, useRef, useState, type ReactNode } from 'react';
import { setSearchParams, useSearchParam } from '../lib/router';
import { plural } from '../lib/text';
import type { View } from '../lib/views';
import { Icon } from '../components/Icon';
import { Pager, pageOf } from '../components/Pager';
import { Rail } from '../components/Rail';

/** Rows a page on a flat, filtered list. */
const LIST_PAGE = 12;
/** Cards a page in the lead rail on web: three by two. */
const RAIL_PAGE = 6;
/** Every group shows three to five listings; smaller groups are left out. */
const GROUP_MIN = 3;
const GROUP_MAX = 5;

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
  const page = Number(useSearchParam('page') ?? 1) || 1;
  const [railPage, setRailPage] = useState(1);

  if (items.length === 0) return <Empty />;

  if (filtered) {
    const pages = Math.ceil(items.length / LIST_PAGE);
    return (
      <>
        {pageOf(items, page, LIST_PAGE).map((i) => (
          <div key={keyOf(i)}>{row(i)}</div>
        ))}
        <Pager
          page={Math.min(page, pages || 1)}
          pages={pages}
          total={items.length}
          noun={noun[1]}
          onChange={(p) => setSearchParams({ page: String(p) })}
        />
      </>
    );
  }

  const groups = views
    .map((v) => ({ view: v, items: items.filter(v.test) }))
    .filter((g) => g.items.length);
  const sized = groups.filter((g) => g.items.length >= GROUP_MIN);
  const shown = sized.length ? sized : groups;
  const railPages = Math.ceil(rail.items.length / RAIL_PAGE);

  return (
    <>
      {rail.items.length > 0 && (
        <section className="mt-2 md:mt-10">
          <GroupHeading title={rail.title} />
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
              count={extra > 0 ? undefined : group.length}
              more={
                extra > 0
                  ? {
                      label: `${extra} more ${extra === 1 ? noun[0] : noun[1]}`,
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
            {group.slice(0, GROUP_MAX).map((i) => (
              <div key={keyOf(i)}>{row(i)}</div>
            ))}
          </section>
        );
      })}
    </>
  );
}

function GroupHeading({
  title,
  count,
  more,
}: {
  title: string;
  count?: number;
  more?: { label: string; onClick: () => void };
}) {
  return (
    <header className="mb-2 flex items-baseline justify-between gap-4 md:mb-6">
      <h2 className="text-[22px] font-semibold tracking-tight md:text-[44px]">
        {title}
        {count !== undefined && (
          <em className="text-fg-3 ml-2 text-sm font-medium not-italic md:text-lg">
            {count}
          </em>
        )}
      </h2>
      {more && (
        <button
          type="button"
          onClick={more.onClick}
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
 * The one line of filters. On web: the count, large, on the left, and the
 * controls on the right in no more than half the page. On phones the
 * controls scroll sideways under the section title instead.
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
    <div className="md:border-line mb-2 md:mb-0 md:flex md:items-center md:justify-between md:gap-6 md:border-b md:pb-6">
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
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:max-w-[50%] md:flex-none md:justify-end md:overflow-visible md:px-0 lg:max-w-[50%]">
        {children}
      </div>
      <p className="text-fg-3 mt-4 text-[15px] md:hidden">
        {plural(count, noun[0], noun[1])}
      </p>
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
