import {
  type RefObject,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { area, context, track } from '../lib/analytics';
import { useIsPhone } from '../lib/media';
import { DesktopTilesProvider } from '../lib/rowLayout';
import { useStore } from '../lib/store';
import {
  searchHref,
  setSearchParams,
  useLocation,
  useSearchParam,
} from '../lib/router';
import type { Listing } from '../lib/types';
import { groupByView, type View } from '../lib/views';
import { HeadingCount } from '../components/HeadingCount';
import { headerSlotStore } from '../components/Header';
import { Icon } from '../components/Icon';
import { Link } from '../components/Link';
import { ListingCard } from '../components/ListingCard';
import { ListingRow } from '../components/ListingRow';
import { clampPage, Pager, pageOf } from '../components/Pager';
import { Rail } from '../components/Rail';
import { ScrollMore } from '../components/ScrollMore';
import { GRID_COLUMNS, PAGE_SIZE } from '../lib/config';

/** Cards a page in the lead rail on web: two rows of the grid. */
const RAIL_PAGE = GRID_COLUMNS * 2;
const PHONE_GROUP_MAX = 9;
/** Whole rows of the web grid, so a group never ends on a lone card while more are waiting. */
const WEB_GROUP_MAX = GRID_COLUMNS * 3;
const PHONE_LEAD_RAIL = 10;
const PHONE_RAIL = 6;

function phoneRailSize(lead: boolean): number {
  return lead ? PHONE_LEAD_RAIL : PHONE_RAIL;
}

export interface LeadRail<T> {
  title: string;
  items: T[];
}

interface FeedBodyProps<T> {
  items: T[];
  views: View<T>[];
  /** Whether anything beyond the reader's own city is picked. */
  filtered: boolean;
  noun: [string, string];
  row: (item: T) => ReactNode;
  keyOf: (item: T) => string;
  rails: LeadRail<T>[];
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
  rails,
  card,
}: FeedBodyProps<T>) {
  const paged = usePagedList(items);
  const location = useLocation();
  const phone = useIsPhone();

  if (items.length === 0) return <Empty />;

  if (filtered) {
    return (
      <div {...area('results')}>
        <TileGrid>
          {paged.items.map((i) => (
            <div key={keyOf(i)}>{row(i)}</div>
          ))}
        </TileGrid>
        <PagedListPager paged={paged} total={items.length} noun={noun[1]} />
      </div>
    );
  }

  const seen = new Set<string>();
  const distinctRails = rails.map((rail, position) => {
    const fresh = rail.items
      .filter((i) => !seen.has(keyOf(i)))
      .slice(0, phone ? phoneRailSize(position === 0) : Infinity);
    fresh.forEach((i) => seen.add(keyOf(i)));
    return { ...rail, items: fresh };
  });
  const shown = groupByView(
    items.filter((i) => !seen.has(keyOf(i))),
    views,
  );

  return (
    <>
      {distinctRails
        .filter((rail) => rail.items.length > 0)
        .map((rail, position) => (
          <LeadRailSection
            key={rail.title}
            rail={rail}
            noun={noun}
            card={card}
            lead={position === 0}
            className={position === 0 ? 'mt-2 md:mt-10' : 'mt-10 md:mt-16'}
          />
        ))}
      {shown.map(({ view, items: group }) => {
        const groupMax = phone ? PHONE_GROUP_MAX : WEB_GROUP_MAX;
        const extra = group.length - groupMax;
        return (
          <section
            key={view.id}
            className="mt-10 md:mt-16"
            {...area('time_group')}
            {...context({ view: view.id })}
          >
            <GroupHeading
              title={view.label}
              count={group.length}
              more={
                extra > 0
                  ? {
                      label: String(extra),
                      aria: `${extra} more ${extra === 1 ? noun[0] : noun[1]}`,
                      href: searchHref(location, {
                        view: view.id,
                        type: null,
                        page: null,
                      }),
                      onClick: () =>
                        track('view_more_clicked', {
                          view: view.id,
                          hidden: extra,
                        }),
                    }
                  : undefined
              }
            />
            <TileGrid>
              {group.slice(0, groupMax).map((i) => (
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
  /** Grows the list by a page, from the element that asked for it. */
  more: ((from: Element) => void) | null;
}

function LeadRailSection<T>({
  rail,
  noun,
  card,
  lead,
  className,
}: {
  rail: LeadRail<T>;
  noun: [string, string];
  card: (item: T) => ReactNode;
  lead: boolean;
  className: string;
}) {
  const [page, setPage] = useState(1);
  return (
    <section
      className={className}
      {...area('lead_rail')}
      {...context({ rail: rail.title })}
    >
      <GroupHeading title={rail.title} count={rail.items.length} />
      <div className="md:hidden">
        <Rail swipe={lead}>{rail.items.map(card)}</Rail>
      </div>
      <div className="hidden md:block">
        <Rail>{pageOf(rail.items, page, RAIL_PAGE).map(card)}</Rail>
        <Pager
          page={page}
          pages={Math.ceil(rail.items.length / RAIL_PAGE)}
          total={rail.items.length}
          noun={noun[1]}
          onChange={setPage}
        />
      </div>
    </section>
  );
}

/**
 * Numbered pages on web. Phones scroll instead: the list grows by a page each
 * time its end comes into view, and starts over when the list itself changes.
 */
export function usePagedList<T>(items: T[], size = PAGE_SIZE): PagedList<T> {
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
      ? (from: Element) => {
          track(
            'list_extended',
            {
              shown: Math.min(count + size, items.length),
              total: items.length,
            },
            from,
          );
          setLoaded({ identity, count: count + size });
        }
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
      <div className="md:hidden">
        {paged.items.map((l) => (
          <ListingRow key={l.id} listing={l} />
        ))}
      </div>
      <div className="mt-10 hidden grid-cols-2 gap-x-8 gap-y-16 md:grid lg:grid-cols-4">
        {paged.items.map((l) => (
          <ListingCard key={l.id} listing={l} mixed />
        ))}
      </div>
      <PagedListPager paged={paged} total={items.length} noun="listings" />
    </>
  );
}

function TileGrid({ children }: { children: ReactNode }) {
  return (
    <DesktopTilesProvider value={true}>
      <div className="md:mt-2 md:grid md:grid-cols-4 md:gap-x-10 md:gap-y-14 xl:gap-x-14">
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
  more?: { label: string; aria: string; href: string; onClick?: () => void };
}) {
  return (
    <header className="mb-2 flex items-baseline justify-between gap-4 md:mb-6">
      <h2 className="min-w-0 truncate text-[22px] font-semibold tracking-tight md:text-[44px]">
        {title}
        {count !== undefined && <HeadingCount count={count} />}
      </h2>
      {more && (
        <Link
          href={more.href}
          onClick={more.onClick}
          aria-label={more.aria}
          className="text-fg-3 hover:text-fg flex shrink-0 items-center gap-0.5 text-[15px]"
        >
          {more.label} <Icon name="chevronRight" />
        </Link>
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
 * The one line of filters on web: the summary, large, on the left, and the
 * controls on the right in no more than half the page. It stays under the
 * header while the page scrolls. Phones filter from the section title's
 * sheet instead.
 */
export function FilterLine({
  summary,
  onClear,
  children,
}: {
  summary: ReactNode;
  /** Shown when something beyond the reader's city is picked. */
  onClear?: () => void;
  children: ReactNode;
}) {
  const line = useRef<HTMLDivElement>(null);
  const slot = useSlotOnceScrolledUnder(line);
  const controls = <div className="flex flex-none gap-2">{children}</div>;
  return (
    <div
      ref={line}
      className="md:border-line md:h-filters hidden md:flex md:items-center md:justify-between md:gap-6 md:border-b"
      {...area('filters')}
    >
      <div className="flex items-baseline gap-5">
        {summary}
        {onClear && (
          <button
            type="button"
            onClick={(e) => {
              track('filters_cleared', {}, e.currentTarget);
              onClear();
            }}
            className="text-fg-2 hover:text-fg text-base"
          >
            Clear filters
          </button>
        )}
      </div>
      {slot ? createPortal(controls, slot) : controls}
    </div>
  );
}

function useSlotOnceScrolledUnder(line: RefObject<HTMLElement | null>) {
  const slot = useStore(headerSlotStore);
  const [under, setUnder] = useState(false);
  useEffect(() => {
    const header = slot?.closest('nav');
    if (!header) {
      setUnder(false);
      return;
    }
    const check = () => {
      const bottom = line.current?.getBoundingClientRect().bottom ?? Infinity;
      setUnder(bottom <= header.getBoundingClientRect().bottom);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [slot, line]);
  return under ? slot : null;
}

export function Tally({
  count,
  noun,
  href,
}: {
  count: number;
  noun: [string, string];
  href?: string;
}) {
  const body = (
    <>
      <b className="text-5xl leading-none font-bold tracking-tight tabular-nums">
        {count.toLocaleString('en-US')}
      </b>
      <span className="text-[22px] font-medium">
        {count === 1 ? noun[0] : noun[1]}
      </span>
    </>
  );
  const layout = 'flex items-baseline gap-2.5';
  return href ? (
    <Link href={href} className={`${layout} hover:text-fg-2`}>
      {body}
    </Link>
  ) : (
    <span className={layout}>{body}</span>
  );
}

/** A menu a filter opens renders in a portal, outside the panel's box. */
const MENU = '[data-radix-popper-content-wrapper]';

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
      const target = e.target as Element;
      if (box.current?.contains(target) || target.closest?.(MENU)) return;
      setOpen(false);
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
        onClick={(e) => {
          if (!open) track('filters_opened', {}, e.currentTarget);
          setOpen(!open);
        }}
        className="bg-btn hover:bg-btn-hover flex h-11 items-center gap-2 rounded-md px-4 text-base font-semibold whitespace-nowrap"
      >
        <Icon name="filter" className="h-4 w-4" />
        Filters
        {active > 0 && (
          <span className="bg-brand grid h-5 min-w-5 place-items-center rounded-sm px-1 text-xs text-white">
            {active}
          </span>
        )}
        <Icon name="chevronDown" className="text-fg-2 h-4 w-4" />
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
