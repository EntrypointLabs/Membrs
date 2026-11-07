import type { ReactNode } from 'react';
import { PAGE_SIZE } from '../lib/config';
import { setSearchParams, useSearchParam } from '../lib/router';
import { plural } from '../lib/text';
import type { View } from '../lib/views';
import { Icon } from '../components/Icon';
import { Pager, pageOf } from '../components/Pager';

interface FeedBodyProps<T> {
  items: T[];
  views: View<T>[];
  /** Whether a view or category is picked. Grouping only applies to "All". */
  filtered: boolean;
  noun: [string, string];
  row: (item: T) => ReactNode;
  keyOf: (item: T) => string;
  /** Lay items out as a card grid instead of rows (promos). */
  grid?: boolean;
}

/**
 * The body every feed shares. With nothing picked, phones see the section
 * grouped by time view, four per group with "N more ›" into that view; web
 * sees the full list with numbered pages. With a view or category picked,
 * both see the flat, paged list, so every "see more" page looks the same.
 */
export function FeedBody<T>({
  items,
  views,
  filtered,
  noun,
  row,
  keyOf,
  grid = false,
}: FeedBodyProps<T>) {
  const page = Number(useSearchParam('page') ?? 1) || 1;
  const pages = Math.ceil(items.length / PAGE_SIZE);
  const list = (
    <>
      <p className="text-fg-3 border-line border-b pb-5 text-[15px]">
        {plural(items.length, noun[0], noun[1])}
      </p>
      {items.length === 0 ? (
        <Empty />
      ) : grid ? (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-8 md:gap-y-16">
          {pageOf(items, page, PAGE_SIZE).map((i) => (
            <div key={keyOf(i)}>{row(i)}</div>
          ))}
        </div>
      ) : (
        pageOf(items, page, PAGE_SIZE).map((i) => (
          <div key={keyOf(i)}>{row(i)}</div>
        ))
      )}
      <Pager
        page={Math.min(page, pages || 1)}
        pages={pages}
        total={items.length}
        noun={noun[1]}
        onChange={(p) => setSearchParams({ page: String(p) })}
      />
    </>
  );
  if (filtered) return list;
  return (
    <>
      <div className="md:hidden">
        {views.map((v) => {
          const group = items.filter(v.test);
          if (!group.length) return null;
          const extra = group.length - 4;
          return (
            <section key={v.id} className="mt-8 first:mt-0">
              <header className="mb-1 flex items-baseline justify-between">
                <h2 className="text-[22px] font-semibold tracking-tight">
                  {v.label}
                  {extra <= 0 && (
                    <em className="text-fg-3 ml-1.5 text-sm not-italic">
                      {group.length}
                    </em>
                  )}
                </h2>
                {extra > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchParams({ view: v.id, type: null })}
                    className="text-fg-3 flex items-center gap-0.5 text-[15px]"
                  >
                    {extra} more {extra === 1 ? noun[0] : noun[1]}{' '}
                    <Icon name="chevronRight" />
                  </button>
                )}
              </header>
              <div
                className={grid ? 'grid grid-cols-2 gap-x-4 gap-y-8 pt-4' : ''}
              >
                {group.slice(0, 4).map((i) => (
                  <div key={keyOf(i)}>{row(i)}</div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="hidden md:block">{list}</div>
    </>
  );
}

export function Empty({
  children = 'Nothing here yet. New listings arrive every morning.',
}: {
  children?: string;
}) {
  return <p className="text-fg-3 py-20 text-center text-lg">{children}</p>;
}

/** The right-aligned row of extra filters under the title. */
export function FilterRow({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 md:mx-0 md:mb-10 md:justify-end md:px-0">
      {children}
    </div>
  );
}

/** Title picker on the left, extra filters on the right, on one line on web. */
export function FeedHeader({ children }: { children: ReactNode }) {
  return (
    <div className="md:flex md:items-start md:justify-between md:gap-8">
      {children}
    </div>
  );
}
