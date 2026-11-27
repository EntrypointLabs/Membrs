import { cn } from '../lib/utils';
import { track } from '../lib/analytics';
import { paths } from '../lib/router';
import { Icon } from './Icon';
import { Link } from './Link';

export const SEARCH_PLACEHOLDER = 'Search events and opportunities';

export const SEARCH_BAR =
  'bg-soft border-line-2 flex h-12 items-center gap-2 rounded-md border pr-1.5 pl-4 transition-colors';

export const SEARCH_BAR_BUTTON =
  'h-9 shrink-0 items-center rounded-md transition-[background-color,scale] duration-150 ease-out active:scale-95';

export function FeedSearch() {
  return (
    <div role="search" className={cn(SEARCH_BAR, 'hover:border-fg-3 pr-4')}>
      <Link
        href={paths.search()}
        onClick={() => track('search_opened', { placement: 'search_bar' })}
        className="text-fg-3 flex min-w-0 flex-1 items-center gap-3 self-stretch"
      >
        <Icon name="search" className="h-5 w-5 shrink-0" />
        <span className="truncate text-base">{SEARCH_PLACEHOLDER}</span>
      </Link>
    </div>
  );
}
