import { closesLine, eventDay } from '../lib/dates';
import { cn } from '../lib/utils';
import { paths } from '../lib/router';
import { priceText } from '../lib/text';
import type { Listing } from '../lib/types';
import { Icon } from './Icon';
import { Kicker } from './Kicker';
import { MediaCard, type MediaFace } from './MediaCard';
import { UrgencyLabel } from './UrgencyLabel';

/** What a listing costs or pays, the figure on the right of a card. */
export function priceOf(listing: Listing): string {
  return listing.kind === 'event' ? listing.price : listing.award;
}

const UNKNOWN_PRICES: ReadonlySet<string> = new Set(['See site', 'See brief']);

export function shownPrice(listing: Listing): string {
  const price = priceOf(listing);
  return UNKNOWN_PRICES.has(price) ? '' : priceText(price);
}

interface ListingCardProps {
  listing: Listing;
  /** On a mixed feed (home) the section tag leads: Event, Opportunity. */
  mixed?: boolean;
}

export function listingFace(listing: Listing, mixed = false): MediaFace {
  return {
    href: paths.listing(listing.slug),
    photo: listing.photo,
    photoUrl: listing.photoUrl,
    title: listing.title,
    tag: listing.category,
    meta:
      listing.kind === 'event' ? (
        <>
          <UrgencyLabel listing={listing} />
          <Meta icon="cal" keep>
            {eventDay(listing)}
          </Meta>
          {listing.city && <Meta icon="pin">{listing.city}</Meta>}
        </>
      ) : (
        <>
          <UrgencyLabel listing={listing} />
          <Meta icon="clock" keep>
            {closesLine(listing)}
          </Meta>
          {listing.organiser && <Meta icon="org">{listing.organiser}</Meta>}
        </>
      ),
    tags: (
      <Kicker
        listing={listing}
        mixed={mixed}
        className="min-w-0 text-[13px] md:text-[15px]"
      />
    ),
    figure: shownPrice(listing),
  };
}

export function ListingCard({ listing, mixed = false }: ListingCardProps) {
  return <MediaCard {...listingFace(listing, mixed)} />;
}

export function Meta({
  icon,
  keep = false,
  children,
}: {
  icon: 'cal' | 'pin' | 'clock' | 'org';
  keep?: boolean;
  children: string;
}) {
  return (
    <span
      className={cn('flex min-w-0 items-center gap-1.5', keep && 'md:shrink-0')}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}
