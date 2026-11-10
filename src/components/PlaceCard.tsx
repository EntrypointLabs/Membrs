import { openStateNow } from '../lib/hours';
import { paths } from '../lib/router';
import type { Place } from '../lib/types';
import { Icon } from './Icon';
import { Link } from './Link';
import { OpenDot } from './PlaceRow';
import { Photo } from './Photo';
import { Tags } from './Tags';

export function PlaceCard({
  place,
  mixed = false,
}: {
  place: Place;
  /** On home the Place tag leads. */
  mixed?: boolean;
}) {
  return (
    <Link href={paths.place(place.id)} className="group flex h-full flex-col">
      <Photo
        id={place.photo}
        alt={place.name}
        className="aspect-[4/3] rounded-md"
      />
      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[13px] md:mt-5">
        <OpenDot place={place} />
        <Tags section={mixed ? 'place' : undefined} names={[place.type]} />
      </p>
      <h3 className="group-hover:text-accent mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight md:mt-2.5 md:text-[23px] md:leading-tight">
        {place.name}
      </h3>
      <div className="text-fg-3 mt-auto flex items-center justify-between gap-3 pt-2 text-[13px] md:pt-3 md:text-[15px]">
        <span className="flex items-center gap-1.5">
          <Icon name="clock" />
          {openStateNow(place).detail}
        </span>
        <span className="text-fg font-medium">{place.entry || 'See gate'}</span>
      </div>
    </Link>
  );
}
