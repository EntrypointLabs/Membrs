import { paths } from '../lib/router';
import type { Place } from '../lib/types';
import { CategoryLabel } from './CategoryLabel';
import { Icon } from './Icon';
import { Link } from './Link';
import { OpenDot } from './PlaceRow';
import { Photo } from './Photo';

export function PlaceCard({ place }: { place: Place }) {
  return (
    <Link href={paths.place(place.id)} className="group flex h-full flex-col">
      <Photo
        id={place.photo}
        alt={place.name}
        className="aspect-[4/3] rounded-md"
      />
      <p className="mt-3 flex flex-wrap gap-x-1.5 text-[13px] md:mt-5 md:text-[15px]">
        <OpenDot place={place} />
        <CategoryLabel name={place.type} dot />
      </p>
      <h3 className="group-hover:text-accent mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight md:mt-2.5 md:text-[23px] md:leading-tight">
        {place.name}
      </h3>
      <div className="text-fg-3 mt-auto flex items-center justify-between gap-3 pt-2 text-[13px] md:pt-3 md:text-[15px]">
        <span className="flex items-center gap-1.5">
          <Icon name="pin" />
          {place.area}, {place.city}
        </span>
        <span className="text-fg font-medium">{place.entry || 'See gate'}</span>
      </div>
    </Link>
  );
}
