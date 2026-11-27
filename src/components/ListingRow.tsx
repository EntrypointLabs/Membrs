import { itemRef, trackItemOpened } from '../lib/analytics';
import type { ListingSummary } from '../lib/types';
import { listingFace } from './ListingCard';
import { MediaRow } from './MediaRow';

export function ListingRow({ listing }: { listing: ListingSummary }) {
  return (
    <MediaRow
      {...listingFace(listing)}
      onClick={(e) =>
        trackItemOpened(e.currentTarget, itemRef.listing(listing), 'row')
      }
    />
  );
}
