import { paths } from '../lib/router';
import type { Promo } from '../lib/types';
import { Icon } from './Icon';
import { Link } from './Link';
import { Photo } from './Photo';
import { promoEnds } from './PromoCard';
import { Tags } from './Tags';

/** A promo in a list: photo, the offer's story, and the discount on the right. */
export function PromoRow({ promo }: { promo: Promo }) {
  return (
    <Link
      href={paths.promo(promo.id)}
      className="group border-line flex items-center gap-4 border-b py-6 md:gap-8 md:py-10"
    >
      <Photo
        size="row"
        id={promo.photo}
        alt={promo.title}
        className="aspect-square w-20 shrink-0 rounded-md md:aspect-[3/2] md:w-[22%]"
      />
      <div className="min-w-0 flex-1">
        <Tags names={[promo.category]} />
        <h3 className="group-hover:text-accent mt-1.5 text-lg leading-snug font-semibold tracking-tight md:text-[26px]">
          {promo.title}
        </h3>
        <p className="text-fg-2 mt-2 line-clamp-2 hidden max-w-2xl text-base md:block">
          {promo.blurb}
        </p>
        <p className="text-fg-3 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
          <span className="flex items-center gap-1.5">
            <Icon name="clock" />
            {promo.startsInDays > 0
              ? `Starts in ${promo.startsInDays} days`
              : promoEnds(promo)}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <Icon name="pin" />
            <span className="truncate">{promo.where}</span>
          </span>
        </p>
      </div>
      <div className="hidden shrink-0 text-right md:block">
        <p className="text-fg-3 text-sm">{promo.merchant}</p>
        <p className="text-xl font-semibold">{promo.offer}</p>
      </div>
    </Link>
  );
}
