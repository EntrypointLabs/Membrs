import { shortDay } from '../lib/dates';
import { paths } from '../lib/router';
import type { Listing } from '../lib/types';
import { Icon } from './Icon';
import { Link } from './Link';
import { Photo } from './Photo';

/**
 * The Most Popular panel: always membrs blue, seven entries, with a large
 * vertical title on its right edge whose colour flips with the theme. The
 * list text inside stays white in both modes.
 */
export function MostPopular({ items }: { items: Listing[] }) {
  return (
    <aside
      aria-labelledby="most-popular"
      className="relative self-start lg:sticky lg:top-6"
    >
      <h2
        id="most-popular"
        className="text-fg absolute top-[-6px] right-[-14px] hidden text-[clamp(64px,5.2vw,92px)] leading-[0.82] font-black tracking-tight [writing-mode:vertical-rl] lg:block"
      >
        Most Popular
      </h2>
      <ol className="bg-brand rounded-lg py-2 pr-[calc(clamp(64px,5.2vw,92px)*0.82+4px)] pl-6 text-white max-lg:pr-6">
        {items.map((l) => (
          <li key={l.id} className="border-b border-white/20 last:border-0">
            <Link
              href={paths.listing(l.id)}
              className="group flex items-center gap-4 py-4"
            >
              <Photo
                id={l.photo}
                alt=""
                className="h-[72px] w-[72px] shrink-0 rounded-md"
              />
              <span className="min-w-0">
                <span className="block text-sm text-white/75">
                  {l.category} ·{' '}
                  {l.kind === 'event'
                    ? shortDay(l.date)
                    : `Closes ${l.deadline.day} ${l.deadline.month}`}
                </span>
                <span className="mt-0.5 block text-lg leading-snug font-semibold group-hover:underline">
                  {l.title}
                </span>
                <span className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
                  <Icon
                    name={l.kind === 'event' ? 'pin' : 'org'}
                    className="h-3.5 w-3.5"
                  />
                  {l.kind === 'event' ? l.city : l.organiser}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
