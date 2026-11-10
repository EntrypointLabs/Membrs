import { paths } from '../lib/router';
import type { Promo } from '../lib/types';
import { Icon } from './Icon';
import { Link } from './Link';
import { Photo } from './Photo';
import { Tags } from './Tags';

/** "Ends today", "Ends in 3 days". */
export function promoEnds(promo: Promo): string {
  if (promo.endsInDays <= 0) return 'Ends today';
  if (promo.endsInDays === 1) return 'Ends tomorrow';
  return `Ends in ${promo.endsInDays} days`;
}

export function PromoCard({
  promo,
  mixed = false,
}: {
  promo: Promo;
  /** On home the Promo tag leads. */
  mixed?: boolean;
}) {
  return (
    <Link href={paths.promo(promo.id)} className="group flex h-full flex-col">
      <div className="relative">
        <Photo
          id={promo.photo}
          alt={promo.title}
          className="aspect-[4/3] rounded-md"
        />
      </div>
      <p className="mt-3 flex text-[13px] md:mt-5">
        <Tags section={mixed ? 'promo' : undefined} names={[promo.category]} />
      </p>
      <h3 className="group-hover:text-accent mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight md:mt-2.5 md:text-[23px] md:leading-tight">
        {promo.title}
      </h3>
      <div className="text-fg-3 mt-auto flex items-center justify-between gap-3 pt-2 text-[13px] md:pt-3 md:text-[15px]">
        <span className="flex items-center gap-1.5">
          <Icon name="clock" />
          {promoEnds(promo)}
        </span>
        <span className="text-fg font-medium">{promo.offer}</span>
      </div>
    </Link>
  );
}
