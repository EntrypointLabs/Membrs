import { openStateNow } from '../lib/hours';
import { paths } from '../lib/router';
import type { Place } from '../lib/types';
import { Icon } from './Icon';
import { Link } from './Link';
import { Photo } from './Photo';
import { Tags } from './Tags';

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
  const state = openStateNow(place);
  return (
    <Link
      href={paths.place(place.id)}
      className="group border-line flex items-center gap-4 border-b py-6 md:gap-8 md:py-10"
    >
      <Photo
        size="row"
        id={place.photo}
        alt={place.name}
        className="aspect-square w-20 shrink-0 rounded-md md:aspect-[3/2] md:w-[22%]"
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-1.5 text-[15px]">
          <OpenDot place={place} />
          <Tags names={[place.type]} />
        </p>
        <h3 className="group-hover:text-accent mt-1.5 text-lg font-semibold tracking-tight md:text-[26px]">
          {place.name}
        </h3>
        <p className="text-fg-2 mt-2 hidden max-w-2xl text-base md:block">
          {place.about}
        </p>
        <p className="text-fg-3 mt-2 flex flex-wrap gap-x-4 text-[15px]">
          <span className="flex items-center gap-1.5">
            <Icon name="pin" />
            {place.area}, {place.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="clock" />
            {state.detail}
          </span>
        </p>
      </div>
      <div className="hidden shrink-0 text-right md:block">
        <p className="text-fg-3 text-sm">Entry</p>
        <p className="text-xl font-semibold">
          {place.entry === '' ? 'See gate' : place.entry}
        </p>
        <p className="text-fg-3 group-hover:text-fg mt-1 flex items-center justify-end gap-1 text-sm">
          View place <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
        </p>
      </div>
    </Link>
  );
}
