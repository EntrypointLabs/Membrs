import { Icon } from './Icon';

interface PagerProps {
  page: number;
  pages: number;
  total: number;
  noun?: string;
  onChange: (page: number) => void;
}

/**
 * Numbered pagination, right-aligned like every other control, with the page
 * count inline to its left so a sticky column ends where the pager ends.
 */
export function Pager({
  page,
  pages,
  total,
  noun = 'listings',
  onChange,
}: PagerProps) {
  if (pages <= 1) return null;
  const go = (next: number, from: HTMLElement) => {
    onChange(next);
    scrollToSectionTop(from);
  };
  const button =
    'h-10 min-w-10 rounded-md px-3 text-[15px] font-semibold transition-colors disabled:opacity-40';
  return (
    <nav
      aria-label="Pagination"
      className="mt-16 flex flex-wrap items-center justify-end gap-2"
    >
      <p className="text-fg-3 mr-3 text-[15px]">
        Page {page} of {pages} · {total.toLocaleString('en-US')} {noun}
      </p>
      <button
        type="button"
        className={`${button} bg-btn hover:bg-btn-hover flex items-center gap-1`}
        disabled={page === 1}
        onClick={(e) => go(page - 1, e.currentTarget)}
      >
        <Icon name="chevronLeft" className="h-4 w-4" /> Previous
      </button>
      {pageWindow(page, pages).map((n, i) =>
        n === null ? (
          <span
            key={`gap-${i}`}
            aria-hidden="true"
            className="text-fg-3 min-w-6 text-center text-[15px] font-semibold"
          >
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            aria-current={n === page ? 'page' : undefined}
            className={`${button} ${n === page ? 'bg-fg text-bg' : 'bg-btn hover:bg-btn-hover'}`}
            onClick={(e) => go(n, e.currentTarget)}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        className={`${button} bg-btn hover:bg-btn-hover flex items-center gap-1`}
        disabled={page === pages}
        onClick={(e) => go(page + 1, e.currentTarget)}
      >
        Next <Icon name="chevronRight" className="h-4 w-4" />
      </button>
    </nav>
  );
}

function scrollToSectionTop(from: HTMLElement): void {
  const section = from.closest('section') ?? from.closest('main');
  if (!section) return;
  const bar = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
      '--spacing-bar',
    ),
  );
  const top = section.getBoundingClientRect().top - (bar || 0);
  if (top < 0) window.scrollBy({ top });
}

const SLOTS = 7;

export function pageWindow(page: number, pages: number): (number | null)[] {
  if (pages <= SLOTS) return Array.from({ length: pages }, (_, i) => i + 1);
  const side = SLOTS - 2;
  if (page <= side - 1)
    return [...Array.from({ length: side }, (_, i) => i + 1), null, pages];
  if (page >= pages - side + 2)
    return [
      1,
      null,
      ...Array.from({ length: side }, (_, i) => pages - side + 1 + i),
    ];
  return [1, null, page - 1, page, page + 1, null, pages];
}

/** Slice one page out of a list. */
export function pageOf<T>(items: T[], page: number, size: number): T[] {
  return items.slice((page - 1) * size, page * size);
}

export function clampPage(raw: string | null, pages: number): number {
  const page = Math.trunc(Number(raw ?? 1));
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(page, 1), Math.max(pages, 1));
}
