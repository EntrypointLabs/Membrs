import { navSection, paths, useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import { openOverlay, overlayStore } from '../lib/ui';
import { Icon } from './Icon';
import { Link } from './Link';
import { NAV } from './nav';

const TABS = NAV.filter((n) => n.key !== 'contribute');

export const GLASS =
  'bg-panel/55 border-line-2 border shadow-[0_8px_32px_rgb(0_0_0/0.35),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-2xl backdrop-saturate-150';

const ITEM =
  'flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-[background-color,scale] duration-150 ease-out active:scale-95';

/**
 * The phone tab bar: one floating pill holding the sections, Ask membrs and,
 * last, search. Icons always carry their colour; the active item also shows
 * its name, so the bar reads at a glance.
 */
export function MobileTabBar() {
  const route = useRoute();
  const active = navSection(route);
  const asking = useStore(overlayStore) === 'assistant';
  const searching = route.page === 'search';
  return (
    <nav
      aria-label="Sections"
      className={`fixed inset-x-3 md:hidden ${asking ? 'z-[65]' : 'z-40'}`}
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <ul
        className={`${GLASS} flex items-center justify-between rounded-full p-1.5`}
      >
        {TABS.map((tab) => {
          const on = active === tab.key && !asking;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-label={tab.label}
                aria-current={on ? 'page' : undefined}
                className={`${ITEM} ${on ? 'bg-soft-hover text-fg' : ''}`}
              >
                <Icon name={tab.icon} className={`h-5 w-5 ${tab.color}`} />
                {on && (tab.short ?? tab.label)}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-label="Ask membrs"
            aria-haspopup="dialog"
            aria-expanded={asking}
            onClick={() => openOverlay('assistant')}
            className={`${ITEM} ${asking ? 'bg-soft-hover text-fg' : ''}`}
          >
            <Icon name="spark" className="text-accent h-5 w-5" />
            {asking && 'Ask'}
          </button>
        </li>
        <li>
          <Link
            href={paths.search()}
            aria-label="Search"
            aria-current={searching ? 'page' : undefined}
            className={`${ITEM} ${searching && !asking ? 'bg-soft-hover text-fg' : ''}`}
          >
            <Icon name="search" className="h-5 w-5" />
            {searching && !asking && 'Search'}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
