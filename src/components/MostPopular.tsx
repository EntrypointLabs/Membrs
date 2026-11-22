import { area, itemRef, trackItemOpened } from '../lib/analytics';
import { closesLine, eventDay } from '../lib/dates';
import { paths } from '../lib/router';
import { cn } from '../lib/utils';
import type { Listing } from '../lib/types';
import { Meta } from './ListingCard';
import { Link } from './Link';
import { Photo } from './Photo';
import { cardTags, listingTags } from './Tags';

/**
 * The vertical title straddles the card's right edge, half on the blue and
 * half outside it, so the rows only make room for the half that is inside.
 */
export function MostPopular({ items }: { items: Listing[] }) {
  return (
    <aside
      aria-labelledby="most-popular"
      className="relative self-start"
      {...area('most_popular')}
    >
      <div className="pointer-events-none absolute top-4 right-[calc(clamp(64px,5.2vw,92px)*-0.41)] bottom-4 hidden md:block">
        <h2
          id="most-popular"
          className="top-bar sticky text-[clamp(64px,5.2vw,92px)] leading-[0.82] font-black tracking-tight text-white [writing-mode:vertical-rl]"
        >
          Most Popular
        </h2>
      </div>
      <RankedList
        items={items}
        className="md:pr-[calc(clamp(64px,5.2vw,92px)*0.41+32px)]"
      />
    </aside>
  );
}

export function RankedList({
  items,
  className = '',
}: {
  items: Listing[];
  className?: string;
}) {
  return (
    <ol
      className={cn(
        'bg-brand grid gap-x-8 rounded-lg py-2 pr-6 pl-6 text-white',
        className,
      )}
    >
      {items.map((l) => (
        <li key={l.id} className="border-b border-white/20">
          <Link
            href={paths.listing(l.slug)}
            onClick={(e) =>
              trackItemOpened(
                e.currentTarget,
                itemRef.listing(l),
                'most_popular',
              )
            }
            className="group flex items-center gap-4 py-4"
          >
            <Photo
              size="thumb"
              id={l.photo}
              src={l.photoUrl}
              cover={{ title: l.title, tag: l.category }}
              alt=""
              className="rounded-photo h-[72px] w-[72px] shrink-0"
            />
            <span className="min-w-0">
              <span className="block text-sm text-white/70">
                {cardTags(l.kind, listingTags(l)).join(' · ')}
              </span>
              <span className="mt-0.5 block text-lg leading-snug font-semibold group-hover:underline">
                {l.title}
              </span>
              <span className="mt-1 flex gap-4 text-sm text-white/70">
                {l.kind === 'event' ? (
                  <>
                    <Meta icon="cal">{eventDay(l)}</Meta>
                    <Meta icon="pin">{l.city}</Meta>
                  </>
                ) : (
                  <Meta icon="clock">{closesLine(l)}</Meta>
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
