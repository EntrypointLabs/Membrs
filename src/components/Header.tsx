import { useEffect, useState } from 'react';
import { sessionStore, signOut } from '../lib/auth';
import { themeStore, type Theme } from '../lib/preferences';
import { toast } from '../lib/ui';
import { AppleMark, openSignIn } from './AuthModal';
import { navSection, paths, useRoute } from '../lib/router';
import { useStore } from '../lib/store';
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
      <header className="sticky z-40 hidden md:block" style={{ top: -TOP_ROW }}>
        <div
          className="page relative flex items-center justify-center py-6"
          style={{ height: TOP_ROW }}
        >
          <Link
            href="/"
            aria-label="MEMBRS home"
            className="text-[64px] leading-none font-black tracking-[-0.05em]"
          >
            MEMBRS
          </Link>
          <div className="absolute right-0 flex items-center gap-2">
            <AccountButton />
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
            className={`page border-line relative flex items-center justify-center ${docked ? '' : 'border-y'}`}
          >
            {docked && (
              <Link
                href="/"
                aria-label="MEMBRS home"
                className="absolute left-0 text-[22px] leading-none font-black tracking-[-0.05em]"
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
                        <button
                          type="button"
                          className={sectionClass(active === item.key)}
                        >
                          <SectionLabel item={item} on={active === item.key} />
                          <Icon name="chevronDown" className="h-3.5 w-3.5" />
                        </button>
                      }
                    />
                  ) : (
                    <Link
                      href={item.href}
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
            <div className="absolute right-0 flex items-center gap-2">
              <Link
                href={paths.search()}
                aria-label="Search"
                data-tour="search"
                className="bg-btn hover:bg-btn-hover grid h-10 w-10 place-items-center rounded-md"
              >
                <Icon name="search" />
              </Link>
              {docked && <ThemeSwitch />}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
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

/** "Sign in" when signed out; the provider mark and "Sign out" when signed in. */
export function AccountButton() {
  const session = useStore(sessionStore);
  return (
    <button
      type="button"
      onClick={() => {
        if (!session) return openSignIn();
        signOut();
        toast('Signed out.');
      }}
      className="bg-btn hover:bg-btn-hover flex h-[38px] items-center gap-2 rounded-md px-3.5 text-sm font-bold"
    >
      {session && (
        <i
          className={`grid h-[22px] w-[22px] place-items-center rounded-full text-xs font-extrabold text-white not-italic ${session.provider === 'apple' ? 'bg-black' : 'bg-brand'}`}
        >
          {session.provider === 'apple' ? (
            <AppleMark className="h-[13px] w-[13px]" />
          ) : (
            'G'
          )}
        </i>
      )}
      {session ? 'Sign out' : 'Sign in'}
    </button>
  );
}
