import { paths } from '../lib/router';
import type { Promo } from '../lib/types';
import { CategoryLabel } from './CategoryLabel';
import { Icon } from './Icon';
import { Link } from './Link';
import { Photo } from './Photo';

/** "Ends today", "Ends in 3 days". */
export function promoEnds(promo: Promo): string {
  if (promo.endsInDays <= 0) return 'Ends today';
  if (promo.endsInDays === 1) return 'Ends tomorrow';
  return `Ends in ${promo.endsInDays} days`;
}

export function PromoCard({ promo }: { promo: Promo }) {
  return (
    <Link href={paths.promo(promo.id)} className="group flex h-full flex-col">
      <div className="relative">
        <Photo
          id={promo.photo}
          alt={promo.title}
          className="aspect-[4/3] rounded-md"
        />
      </div>
      <p className="mt-3 flex flex-wrap gap-x-1.5 text-[13px] md:mt-5 md:text-[15px]">
        <span className="text-brand dark:text-accent font-semibold">
          {promo.offer}
        </span>
        <CategoryLabel name={promo.category} />
        <span className="text-fg-3">· {promo.merchant}</span>
      </p>
      <h3 className="group-hover:text-accent mt-1 line-clamp-2 text-base leading-snug font-semibold tracking-tight md:mt-2.5 md:text-[23px] md:leading-tight">
        {promo.title}
      </h3>
      <p className="text-fg-3 mt-auto flex items-center gap-1.5 pt-2 text-[13px] md:pt-3 md:text-[15px]">
        <Icon name="clock" />
        {promoEnds(promo)}
      </p>
    </Link>
  );
}
