import { itemRef, trackItemOpened } from '../lib/analytics';
import { openStateNow } from '../lib/hours';
import { paths } from '../lib/router';
import type { Place } from '../lib/types';
import { Meta } from './ListingCard';
import { MediaCard, type MediaFace } from './MediaCard';
import { OpenDot } from './PlaceRow';
import { Tags } from './Tags';

export function placeFace(place: Place, mixed = false): MediaFace {
  const where = [place.area, place.city].filter(Boolean).join(', ');
  return {
    href: paths.place(place.id),
    photo: place.photo,
    title: place.name,
    tag: place.type,
    meta: (
      <>
        <span className="flex items-center gap-1.5">
          <OpenDot place={place} />
          <span className="truncate">{openStateNow(place).detail}</span>
        </span>
        {where && <Meta icon="pin">{where}</Meta>}
      </>
    ),
    tags: <Tags section={mixed ? 'place' : undefined} names={[place.type]} />,
    figure: place.entry,
  };
}

export function PlaceCard({
  place,
  mixed = false,
}: {
  place: Place;
  mixed?: boolean;
}) {
  return (
    <MediaCard
      {...placeFace(place, mixed)}
      onClick={(e) =>
        trackItemOpened(e.currentTarget, itemRef.place(place), 'card')
      }
    />
  );
}
