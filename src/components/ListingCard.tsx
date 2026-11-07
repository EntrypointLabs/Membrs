import { shortDay } from '../lib/dates';
import { paths } from '../lib/router';
import type { Listing } from '../lib/types';
import { Icon } from './Icon';
import { Kicker } from './Kicker';
import { Link } from './Link';
import { Photo } from './Photo';

/** What a listing costs or pays, the figure on the right of a card. */
export function priceOf(listing: Listing): string {
  return listing.kind === 'event' ? listing.price : listing.award;
}

interface ListingCardProps {
  listing: Listing;
}

/**
 * The grid card. A flex column, so the date row sits at the bottom of every
 * card and a row of cards lines up no matter how long each title runs.
 */
export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link
      href={paths.listing(listing.id)}
      className="group flex h-full flex-col"
    >
      <div className="relative">
        <Photo
          id={listing.photo}
          alt={listing.title}
          className="aspect-[4/3] rounded-md"
        />
      </div>
      <Kicker
        listing={listing}
        className="mt-3 text-[13px] md:mt-5 md:text-[15px]"
      />
      <h3 className="group-hover:text-accent mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight md:mt-2.5 md:text-[23px] md:leading-tight">
        {listing.title}
      </h3>
      <div className="text-fg-3 mt-auto flex flex-col items-start gap-1 pt-2 text-[13px] md:flex-row md:items-center md:justify-between md:gap-3 md:pt-3 md:text-[15px]">
        <span className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-3">
          {listing.kind === 'event' ? (
            <>
              <Meta icon="cal">{shortDay(listing.date)}</Meta>
              <Meta icon="pin">{listing.city}</Meta>
            </>
          ) : (
            <>
              <Meta icon="clock">{`Closes ${listing.deadline.day} ${listing.deadline.month}`}</Meta>
              <Meta icon="org">{listing.organiser}</Meta>
            </>
          )}
        </span>
        <span className="text-fg shrink-0 font-medium">{priceOf(listing)}</span>
      </div>
    </Link>
  );
}

export function Meta({
  icon,
  children,
}: {
  icon: 'cal' | 'pin' | 'clock' | 'org';
  children: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}
