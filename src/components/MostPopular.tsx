import { shortDay } from '../lib/dates';
import { paths } from '../lib/router';
import type { Listing } from '../lib/types';
import { Meta } from './ListingCard';
import { Link } from './Link';
import { Photo } from './Photo';
import { listingTags } from './Tags';
import { SECTION_TAGS } from '../lib/palette';

/**
 * The Most Popular panel, ten entries in two columns. It takes the opposite
 * colour mode to the page (white over dark, near-black over light), and only
 * the large vertical title on its right edge is membrs blue. It is a
 * showcase, not a grid of cards, so its tags read as plain text.
 */
export function MostPopular({ items }: { items: Listing[] }) {
  return (
    <aside aria-labelledby="most-popular" className="relative self-start">
      <h2
        id="most-popular"
        className="text-brand dark:text-accent absolute top-[-6px] right-[-14px] hidden text-[clamp(64px,5.2vw,92px)] leading-[0.82] font-black tracking-tight [writing-mode:vertical-rl] md:block"
      >
        Most Popular
      </h2>
      <ol className="bg-inv text-inv-fg grid gap-x-8 rounded-lg py-2 pr-[calc(clamp(64px,5.2vw,92px)*0.82+4px)] pl-6 xl:grid-cols-2">
        {items.map((l) => (
          <li key={l.id} className="border-inv-line border-b">
            <Link
              href={paths.listing(l.id)}
              className="group flex items-center gap-4 py-4"
            >
              <Photo
                size="thumb"
                id={l.photo}
                src={l.photoUrl}
                alt=""
                className="h-[72px] w-[72px] shrink-0 rounded-md"
              />
              <span className="min-w-0">
                <span className="text-inv-fg-3 block text-sm">
                  {[SECTION_TAGS[l.kind][0], ...listingTags(l)].join(' · ')}
                </span>
                <span className="mt-0.5 block text-lg leading-snug font-semibold group-hover:underline">
                  {l.title}
                </span>
                <span className="text-inv-fg-3 mt-1 flex gap-4 text-sm">
                  {l.kind === 'event' ? (
                    <>
                      <Meta icon="cal">{shortDay(l.date)}</Meta>
                      <Meta icon="pin">{l.city}</Meta>
                    </>
                  ) : (
                    <Meta icon="clock">{`Closes ${shortDay(l.deadline)}`}</Meta>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
