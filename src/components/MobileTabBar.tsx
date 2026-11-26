import { area, context, track } from '../lib/analytics';
import { listingByKey } from '../lib/api';
import { navSection, type Route, useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import { typingStore } from '../lib/typing';
import { closeOverlay, openOverlay, overlayStore } from '../lib/ui';
import { Icon } from './Icon';
import { Link } from './Link';
import { NAV } from './nav';

const TABS = NAV.filter((n) => n.key !== 'contribute');

export const GLASS =
  'bg-panel/85 border-line-2 border shadow-[0_8px_32px_rgb(0_0_0/0.35),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-2xl backdrop-saturate-150';

const ITEM =
  'grid h-11 w-12 place-items-center rounded-[14px] transition-[background-color,color,scale] duration-150 ease-out active:scale-95';
const ON = 'bg-soft-hover text-fg';
const OFF = 'text-fg-2';
const BAR_RADIUS = 22;

export function MobileTabBar() {
  const route = useRoute();
  const active = sectionOf(route);
  const asking = useStore(overlayStore) === 'assistant';
  const searching = route.page === 'search';
  const typing = useStore(typingStore);
  if (searching || typing) return null;
  return (
    <>
      <div
        aria-hidden="true"
        className={`from-bg via-bg/85 pointer-events-none fixed inset-x-0 bottom-0 bg-gradient-to-t to-transparent md:hidden ${asking ? 'z-[64]' : 'z-30'}`}
        style={{ height: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
      />
      <nav
        aria-label="Sections"
        {...area('tab_bar')}
        className={`fixed inset-x-3 md:hidden ${asking ? 'z-[65]' : 'z-40'}`}
        style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <ul
          style={{ borderRadius: BAR_RADIUS }}
          className={`${GLASS} flex items-center justify-around px-3 py-1.5`}
        >
          {TABS.map((tab) => {
            const on = active === tab.key && !asking;
            return (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  onClick={() => {
                    if (asking) closeOverlay();
                    track('nav_clicked', {
                      item: tab.key,
                      placement: 'tab_bar',
                    });
                  }}
                  aria-label={tab.label}
                  aria-current={on ? 'page' : undefined}
                  className={`${ITEM} ${on ? ON : OFF}`}
                >
                  <Icon name={tab.icon} className="h-[22px] w-[22px]" />
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
              onClick={() =>
                asking ? closeOverlay() : openOverlay('assistant')
              }
              {...context({ action: 'ask_membrs' })}
              className={`${ITEM} ${asking ? ON : OFF}`}
            >
              <Icon name="robot" className="h-[22px] w-[22px]" />
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

function sectionOf(route: Route) {
  if (route.page !== 'listing') return navSection(route);
  const kind = listingByKey(route.id)?.kind;
  if (!kind) return null;
  return kind === 'event' ? 'events' : 'opportunities';
}
