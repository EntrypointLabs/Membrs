import { urgencyLabel } from '../lib/dates';
import type { Listing } from '../lib/types';

export const URGENCY_COLOR = {
  now: 'text-urgent',
  soon: 'text-warning',
  later: 'text-accent',
} as const;

export function UrgencyLabel({ listing }: { listing: Listing }) {
  const label = urgencyLabel(listing);
  if (!label) return null;
  return (
    <span
      className={`shrink-0 font-semibold whitespace-nowrap ${URGENCY_COLOR[label.urgency]}`}
    >
      {label.text}
    </span>
  );
}
