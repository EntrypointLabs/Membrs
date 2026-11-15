import type { Listing } from '../lib/types';
import { listingFace } from './ListingCard';
import { MediaRow } from './MediaRow';

export function ListingRow({ listing }: { listing: Listing }) {
  return <MediaRow {...listingFace(listing)} />;
}
