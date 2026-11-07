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
        onClick={() => onChange(page - 1)}
      >
        <Icon name="chevronLeft" className="h-4 w-4" /> Previous
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-current={n === page ? 'page' : undefined}
          className={`${button} ${n === page ? 'bg-fg text-bg' : 'bg-btn hover:bg-btn-hover'}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className={`${button} bg-btn hover:bg-btn-hover flex items-center gap-1`}
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
      >
        Next <Icon name="chevronRight" className="h-4 w-4" />
      </button>
    </nav>
  );
}

/** Slice one page out of a list. */
export function pageOf<T>(items: T[], page: number, size: number): T[] {
  return items.slice((page - 1) * size, page * size);
}
