import { shortDay } from '../lib/dates';
import { paths } from '../lib/router';
import type { Listing } from '../lib/types';
import { Icon } from './Icon';
import { Kicker } from './Kicker';
import { Link } from './Link';
import { Photo } from './Photo';
import { priceOf } from './ListingCard';

/**
 * A feed row: photo, the listing's story, and the price on the right. On a
 * phone it collapses to a small square photo beside the text, the way Luma
 * lists events.
 */
export function ListingRow({ listing }: { listing: Listing }) {
  const event = listing.kind === 'event';
  return (
    <Link
      href={paths.listing(listing.id)}
      className="group border-line flex items-center gap-4 border-b py-6 md:gap-8 md:py-10"
    >
      <Photo
        id={listing.photo}
        alt={listing.title}
        className="aspect-square w-20 shrink-0 rounded-md md:aspect-[3/2] md:w-[22%]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Kicker listing={listing} className="text-[13px] md:text-[15px]" />
        </div>
        <h3 className="group-hover:text-accent mt-1.5 text-lg leading-snug font-semibold tracking-tight md:text-[26px]">
          {listing.title}
        </h3>
        <p className="text-fg-2 mt-2 line-clamp-2 hidden max-w-2xl text-base md:block">
          {listing.blurb}
        </p>
        <p className="text-fg-3 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
          <span className="flex items-center gap-1.5">
            <Icon name={event ? 'cal' : 'clock'} />
            {event
              ? `${shortDay(listing.date)}${listing.time.includes(':') ? `, ${listing.time}` : ''}`
              : `Closes ${shortDay(listing.deadline)}`}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <Icon name={event ? 'pin' : 'org'} />
            <span className="truncate">
              {event
                ? listing.venue === 'Venue TBA'
                  ? listing.city
                  : `${listing.venue}, ${listing.area}`
                : listing.organiser}
            </span>
          </span>
        </p>
      </div>
      <div className="hidden shrink-0 text-right md:block">
        <p className="text-fg-3 text-sm">
          {event ? (listing.free ? 'Entry' : 'From') : 'Award'}
        </p>
        <p className="text-xl font-semibold">{priceOf(listing)}</p>
        <p className="text-fg-3 group-hover:text-fg mt-1 flex items-center justify-end gap-1 text-sm">
          View {event ? 'event' : 'opportunity'}{' '}
          <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
        </p>
      </div>
    </Link>
  );
}
