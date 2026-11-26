import { context, track } from '../lib/analytics';
import { paths } from '../lib/router';
import { useStore } from '../lib/store';
import { openOverlay, overlayStore } from '../lib/ui';
import { Icon } from './Icon';
import { Link } from './Link';
import { MembrsMark } from './MembrsMark';

export const SEARCH_PLACEHOLDER = 'Search events and opportunities';

export const SEARCH_BAR =
  'bg-soft border-line-2 flex h-12 items-center gap-2 rounded-md border pr-1.5 pl-4 transition-colors';

export const SEARCH_BAR_BUTTON =
  'h-9 shrink-0 items-center rounded-md transition-[background-color,scale] duration-150 ease-out active:scale-95';

export function FeedSearch() {
  const asking = useStore(overlayStore) === 'assistant';
  return (
    <div role="search" className={`${SEARCH_BAR} hover:border-fg-3`}>
      <Link
        href={paths.search()}
        onClick={() => track('search_opened', { placement: 'search_bar' })}
        className="text-fg-3 flex min-w-0 flex-1 items-center gap-3 self-stretch"
      >
        <Icon name="search" className="h-5 w-5 shrink-0" />
        <span className="truncate text-base">{SEARCH_PLACEHOLDER}</span>
      </Link>
      <button
        type="button"
        aria-label="Ask membrs"
        aria-haspopup="dialog"
        aria-expanded={asking}
        onClick={() => openOverlay('assistant')}
        {...context({ action: 'ask_membrs' })}
        className={`${SEARCH_BAR_BUTTON} bg-btn hover:bg-btn-hover flex gap-2 pr-3.5 pl-2 text-[15px] font-semibold`}
      >
        <MembrsMark className="size-6 rounded-md" />
        Ask
      </button>
    </div>
  );
}
