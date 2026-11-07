import type { CSSProperties } from 'react';
import { eventTag } from '../lib/dates';
import type { Listing } from '../lib/types';
import { CategoryLabel } from './CategoryLabel';

/**
 * The line above a listing title: the time tag, the category in its colour,
 * and the city. Tags are plain coloured text, never a filled pill, so a row
 * of cards stays calm.
 */
export function Kicker({
  listing,
  className = '',
}: {
  listing: Listing;
  className?: string;
}) {
  const tag = listing.kind === 'event' ? eventTag(listing) : '';
  return (
    <p
      className={`flex flex-wrap items-center gap-x-1.5 text-[15px] ${className}`}
    >
      {tag && (
        <span
          className="cat-color font-medium"
          style={{ '--c': '#d24d42', '--cd': '#fda296' } as CSSProperties}
        >
          {tag}
        </span>
      )}
      <CategoryLabel name={listing.category} dot={Boolean(tag)} />
      <span className="text-fg-3">· {listing.city}</span>
    </p>
  );
}
