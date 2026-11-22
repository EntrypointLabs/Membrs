import { itemRef, trackItemOpened } from '../lib/analytics';
import { openStateNow } from '../lib/hours';
import type { Place } from '../lib/types';
import { MediaRow } from './MediaRow';
import { placeFace } from './PlaceCard';

export function OpenDot({ place }: { place: Place }) {
  const state = openStateNow(place);
  const color = state.open
    ? state.closingSoon
      ? 'text-warning'
      : 'text-open'
    : 'text-fg-3';
  return (
    <span className={`inline-flex items-center gap-1.5 ${color}`}>
      <i className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {state.label}
    </span>
  );
}

export function PlaceRow({ place }: { place: Place }) {
  return (
    <MediaRow
      {...placeFace(place)}
      onClick={(e) =>
        trackItemOpened(e.currentTarget, itemRef.place(place), 'row')
      }
    />
  );
}
