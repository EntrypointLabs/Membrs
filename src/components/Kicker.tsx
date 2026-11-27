import type { ListingSummary } from '../lib/types';
import { listingTags, Tags } from './Tags';

/**
 * The tags above a listing title. On mixed feeds (home) the section comes
 * first, so "Event" and "Music" sit side by side; on a section's own page the
 * section is implied and only the category (and an opportunity's sector)
 * shows. The time and city live in the meta line under the title, not here.
 */
export function Kicker({
  listing,
  mixed = false,
  className = '',
}: {
  listing: ListingSummary;
  mixed?: boolean;
  className?: string;
}) {
  return (
    <p className={`flex max-w-full min-w-0 ${className}`}>
      <Tags
        section={mixed ? listing.kind : undefined}
        names={listingTags(listing)}
      />
    </p>
  );
}
