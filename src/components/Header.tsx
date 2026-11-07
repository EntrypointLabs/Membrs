import { themeStore, type Theme } from '../lib/preferences';
import { navSection, paths, useRoute } from '../lib/router';
import { useStore } from '../lib/store';
import { Icon } from './Icon';
import { Link } from './Link';
import { NAV } from './nav';

/**
 * The web header: the MEMBRS wordmark centred, the theme switch on the right,
 * and the section nav underneath. Hidden on phones, where the tab bar and
 * each screen's own title take over.
 */
export function Header() {
  const route = useRoute();
  const active = navSection(route);
  return (
    <header className="page hidden md:block">
      <div className="relative flex items-center justify-center py-6">
        <Link
          href="/"
          aria-label="membrs home"
          className="text-[64px] leading-none font-black tracking-[-0.05em]"
        >
          MEMBRS
        </Link>
        <ThemeSwitch className="absolute right-0" />
      </div>
      <nav
        aria-label="Sections"
        className="border-line relative flex items-center justify-center border-y"
      >
        <ul className="flex items-center gap-[clamp(8px,2vw,40px)]">
          {NAV.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active === item.key ? 'page' : undefined}
                data-tour={item.key === 'events' ? 'nav-events' : undefined}
                className={`relative flex h-14 items-center gap-2 text-[clamp(13px,1vw,16px)] font-bold tracking-wide uppercase transition-colors ${
                  active === item.key ? 'text-fg' : 'text-fg-3 hover:text-fg'
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`hidden h-4 w-4 lg:block ${item.color}`}
                />
                {item.label}
                {active === item.key && (
                  <span
                    className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${item.bar}`}
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={paths.search()}
          aria-label="Search"
          data-tour="search"
          className="bg-btn hover:bg-btn-hover absolute right-0 grid h-10 w-10 place-items-center rounded-md"
        >
          <Icon name="search" />
        </Link>
      </nav>
    </header>
  );
}

export function ThemeSwitch({ className = '' }: { className?: string }) {
  const theme = useStore(themeStore);
  const option = (value: Theme, icon: 'sun' | 'moon') => (
    <button
      type="button"
      aria-label={`${value} mode`}
      aria-pressed={theme === value}
      onClick={() => themeStore.set(value)}
      className={`grid h-8 w-8 place-items-center rounded-sm transition-colors ${
        theme === value
          ? 'bg-panel text-fg shadow-sm'
          : 'text-fg-4 hover:text-fg'
      }`}
    >
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
  return (
    <div className={`bg-soft flex gap-0.5 rounded-md p-1 ${className}`}>
      {option('light', 'sun')}
      {option('dark', 'moon')}
    </div>
  );
}
