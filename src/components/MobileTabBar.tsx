import { motion } from 'motion/react';
import { listingByKey } from '../lib/api';
import { PHONE_PILL, PILL_SPRING } from '../lib/motion';
import { navSection, paths, type Route, useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import { openOverlay, overlayStore } from '../lib/ui';
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

/**
 * The phone tab bar: one floating rounded bar of icons, the sections, Ask
 * membrs as a small orb and, last, search. Icons share one colour and the
 * active one sits on a soft tile, so the bar stays quiet over photos.
 */
export function MobileTabBar() {
  const route = useRoute();
  const active = sectionOf(route);
  const asking = useStore(overlayStore) === 'assistant';
  const searching = route.page === 'search';
  if (asking || searching) return null;
  return (
    <>
      <div
        aria-hidden="true"
        className="from-bg via-bg/85 pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t to-transparent md:hidden"
        style={{ height: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
      />
      <nav
        aria-label="Sections"
        className="fixed inset-x-3 z-40 md:hidden"
        style={{ bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}
      >
        <motion.ul
          layoutId={PHONE_PILL}
          transition={PILL_SPRING}
          style={{ borderRadius: BAR_RADIUS }}
          className={`${GLASS} flex items-center justify-between px-3 py-1.5`}
        >
          {TABS.map((tab) => {
            const on = active === tab.key && !asking;
            return (
              <li key={tab.key}>
                <Link
                  href={tab.href}
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
              onClick={() => openOverlay('assistant')}
              className={`${ITEM} ${asking ? ON : OFF}`}
            >
              <span
                aria-hidden="true"
                className="ask-orb ask-orb-small size-6"
              />
            </button>
          </li>
          <li>
            <Link
              href={paths.search()}
              aria-label="Search"
              aria-current={searching ? 'page' : undefined}
              className={`${ITEM} ${searching && !asking ? ON : OFF}`}
            >
              <Icon name="search" className="h-[22px] w-[22px]" />
            </Link>
          </li>
        </motion.ul>
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
