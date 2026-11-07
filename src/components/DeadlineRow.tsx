import { deadlineUrgency } from '../lib/dates';
import { paths } from '../lib/router';
import type { OpportunityListing } from '../lib/types';
import { CategoryLabel } from './CategoryLabel';
import { Link } from './Link';

const URGENCY_COLOR = {
  now: 'text-urgent',
  soon: 'text-warning',
  later: 'text-accent',
} as const;

/**
 * A Closing Soon row. The countdown leads in its urgency colour with no box
 * around it: red for three days or less, amber for a week, blue after that.
 */
export function DeadlineRow({ listing }: { listing: OpportunityListing }) {
  return (
    <Link
      href={paths.listing(listing.id)}
      className="group border-line grid grid-cols-[56px_1fr] items-center gap-4 border-b py-5 md:grid-cols-[96px_1fr_auto] md:gap-5 md:py-7"
    >
      <span
        className={`leading-none ${URGENCY_COLOR[deadlineUrgency(listing.daysLeft)]}`}
      >
        <b className="block text-2xl font-semibold tracking-tight md:text-4xl">
          {listing.daysLeft}d
        </b>
        <span className="text-fg-3 text-sm">left</span>
      </span>
      <span className="min-w-0">
        <span className="group-hover:text-accent block text-base leading-snug font-semibold md:text-xl">
          {listing.title}
        </span>
        <span className="text-fg-3 mt-1 block text-sm">
          {listing.organiser} · <CategoryLabel name={listing.category} dot />
        </span>
      </span>
      <span className="hidden text-right md:block">
        <span className="block text-[15px] font-medium">{listing.award}</span>
        <span className="text-fg-3 block text-sm">
          {listing.remote ? 'Remote' : listing.city}
        </span>
      </span>
    </Link>
  );
}
