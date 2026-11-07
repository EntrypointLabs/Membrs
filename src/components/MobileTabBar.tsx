import { navSection, paths, useRoute } from '../lib/router';
import { Icon } from './Icon';
import { Link } from './Link';
import { NAV } from './nav';

const TABS = NAV.filter((n) => !['digest', 'contribute'].includes(n.key));

/**
 * The phone tab bar: a floating pill of sections plus a round search button.
 * Icons always carry their section colour; the active tab also shows its
 * name, so the bar reads at a glance.
 */
export function MobileTabBar() {
  const active = navSection(useRoute());
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-3 z-40 flex items-center gap-2 md:hidden"
      style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
    >
      <ul className="border-line-2 bg-panel/90 flex flex-1 items-center justify-between rounded-full border p-1.5 shadow-xl backdrop-blur-xl">
        {TABS.map((tab) => {
          const on = active === tab.key;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-label={tab.label}
                aria-current={on ? 'page' : undefined}
                className={`flex h-11 items-center gap-2 rounded-full px-3 text-[15px] font-semibold ${
                  on ? 'bg-soft-hover text-fg' : ''
                }`}
              >
                <Icon name={tab.icon} className={`h-5 w-5 ${tab.color}`} />
                {on && (tab.short ?? tab.label)}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href={paths.search()}
        aria-label="Search"
        className="border-line-2 bg-panel/90 grid h-14 w-14 place-items-center rounded-full border shadow-xl backdrop-blur-xl"
      >
        <Icon name="search" className="h-5 w-5" />
      </Link>
    </nav>
  );
}
