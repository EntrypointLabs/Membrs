import { useEffect, useState, type MouseEvent } from 'react';
import { DropdownMenu } from 'radix-ui';
import { area, context, track } from '../lib/analytics';
import { forgetEmail, sessionStore } from '../lib/auth';
import { themeStore, type Theme } from '../lib/preferences';
import { openOverlay, toast } from '../lib/ui';
import { navSection, paths, useRoute } from '../lib/router';
import { createStore, useStore } from '../lib/store';
import { Icon } from './Icon';
import { Link } from './Link';
import { ContributeMenu } from './ContributeMenu';
import { NAV, type NavItem } from './nav';

/**
 * The web header: the MEMBRS wordmark centred, the theme switch on the right,
 * and the section nav underneath. Hidden on phones, where the tab bar and
 * each screen's own title take over.
 */
const TOP_ROW = 112;

export const headerSlotStore = createStore<HTMLElement | null>(null, null);

function placeHeaderSlot(slot: HTMLDivElement | null) {
  headerSlotStore.set(slot);
}

function useScrolledPast(offset: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const check = () => setPast(window.scrollY > offset);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [offset]);
  return past;
}

export function Header() {
  const route = useRoute();
  const active = navSection(route);
  const docked = useScrolledPast(TOP_ROW);
  return (
    <>
      <a
        href="#main"
        className="bg-fg text-bg sr-only z-[200] rounded-md px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header
        className="sticky z-40 hidden md:block"
        style={{ top: -TOP_ROW }}
        {...area('header')}
      >
        <div
          className="page relative flex items-center justify-center py-6"
          style={{ height: TOP_ROW }}
        >
          <Link
            href={paths.home()}
            aria-label="MEMBRS home"
            onClick={() => track('logo_clicked', { placement: 'header' })}
            className="text-[64px] leading-none font-black tracking-[-0.05em]"
          >
            MEMBRS
          </Link>
          <div className="absolute right-0 flex items-center gap-2">
            <ThemeSwitch />
          </div>
        </div>
        <nav
          aria-label="Sections"
          className={`border-line transition-colors ${
            docked ? 'bg-bg/80 border-b backdrop-blur-md' : ''
          }`}
        >
          <div
            className={`page border-line relative ${
              docked
                ? 'grid grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)] items-center gap-6'
                : 'flex items-center justify-center border-y'
            }`}
          >
            {docked && (
              <Link
                href={paths.home()}
                aria-label="MEMBRS home"
                onClick={() =>
                  track('logo_clicked', { placement: 'header_docked' })
                }
                className="justify-self-start text-[22px] leading-none font-black tracking-[-0.05em]"
              >
                MEMBRS
              </Link>
            )}
            <ul className="flex items-center gap-[clamp(8px,2vw,40px)]">
              {NAV.map((item) => (
                <li key={item.key}>
                  {item.key === 'contribute' ? (
                    <ContributeMenu
                      trigger={
                        <Link
                          href={item.href}
                          onClick={keepMenuClick}
                          aria-current={
                            active === item.key ? 'page' : undefined
                          }
                          {...context({ action: 'contribute_menu' })}
                          className={sectionClass(active === item.key)}
                        >
                          <SectionLabel item={item} on={active === item.key} />
                          <Icon name="chevronDown" className="h-3.5 w-3.5" />
                        </Link>
                      }
                    />
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() =>
                        track('nav_clicked', {
                          item: item.key,
                          placement: 'header',
                        })
                      }
                      aria-current={active === item.key ? 'page' : undefined}
                      data-tour={
                        item.key === 'events' ? 'nav-events' : undefined
                      }
                      className={sectionClass(active === item.key)}
                    >
                      <SectionLabel item={item} on={active === item.key} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <div
              className={`flex items-center gap-2 ${docked ? 'justify-self-end' : 'absolute right-0'}`}
            >
              {docked && (
                <div
                  ref={placeHeaderSlot}
                  className="flex items-center gap-2"
                />
              )}
              <Link
                href={paths.search()}
                aria-label="Search"
                onClick={() => track('search_opened', { placement: 'header' })}
                data-tour="search"
                className="bg-btn hover:bg-btn-hover grid h-10 w-10 place-items-center rounded-md"
              >
                <Icon name="search" />
              </Link>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}

function keepMenuClick(e: MouseEvent<HTMLAnchorElement>) {
  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) e.preventDefault();
}

function sectionClass(on: boolean): string {
  return `relative flex h-14 items-center gap-2 text-[clamp(14px,1.1vw,17px)] font-bold tracking-wide uppercase transition-colors ${
    on ? 'text-fg' : 'text-fg-3 hover:text-fg'
  }`;
}

function SectionLabel({ item, on }: { item: NavItem; on: boolean }) {
  return (
    <>
      <Icon
        name={item.icon}
        className={`hidden h-[18px] w-[18px] lg:block ${item.color}`}
      />
      {item.label}
      {on && (
        <span
          className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${item.bar}`}
        />
      )}
    </>
  );
}

/**
 * One button that flips the theme. Both icons sit in the same spot and swap
 * with a short turn, so the control shows the mode you are in.
 */
export function ThemeSwitch({ className = '' }: { className?: string }) {
  const theme = useStore(themeStore);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const icon = (name: 'sun' | 'moon', shown: boolean) => (
    <Icon
      name={name}
      className={`col-start-1 row-start-1 h-4 w-4 transition-[opacity,rotate,scale] duration-300 ease-out ${
        shown
          ? 'scale-100 rotate-0 opacity-100'
          : 'scale-50 -rotate-90 opacity-0'
      }`}
    />
  );
  return (
    <button
      type="button"
      aria-label={`Switch to ${next} mode`}
      onClick={() => themeStore.set(next)}
      className={`bg-btn hover:bg-btn-hover text-fg grid h-10 w-10 place-items-center rounded-md transition-[background-color,scale] duration-150 ease-out active:scale-95 ${className}`}
    >
      {icon('sun', theme === 'light')}
      {icon('moon', theme === 'dark')}
    </button>
  );
}

const SETTINGS_ITEM =
  'data-[highlighted]:bg-soft-hover flex h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-[15px] font-medium outline-none';

export function PhoneSettings() {
  const session = useStore(sessionStore);
  const theme = useStore(themeStore);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label="Settings"
        className="bg-btn grid h-11 w-11 place-items-center rounded-md"
      >
        <Icon name="settings" className="h-5 w-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          {...area('settings_menu')}
          className="bg-panel border-line-2 text-fg z-[70] min-w-52 rounded-md border p-1 shadow-[0_16px_48px_rgb(0_0_0/0.35)]"
        >
          <DropdownMenu.Item
            className={SETTINGS_ITEM}
            onSelect={() => themeStore.set(next)}
          >
            <Icon name={next === 'dark' ? 'moon' : 'sun'} className="h-4 w-4" />
            {next === 'dark' ? 'Dark mode' : 'Light mode'}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={SETTINGS_ITEM}
            onSelect={() => {
              track('digest_opened', { placement: 'settings_menu' });
              openOverlay('prefs');
            }}
          >
            <Icon name="tag" className="h-4 w-4" />
            Edit interests
          </DropdownMenu.Item>
          {session?.account && (
            <>
              <DropdownMenu.Separator className="bg-line-2 my-1 h-px" />
              <DropdownMenu.Item
                className={`${SETTINGS_ITEM} text-destructive`}
                onSelect={() => {
                  forgetEmail();
                  toast('This browser no longer knows your email.');
                }}
              >
                <Icon name="arrowUpRight" className="h-4 w-4" />
                <span className="min-w-0 truncate">
                  Forget {session.account.email}
                </span>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
