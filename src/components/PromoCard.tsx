import { itemRef, trackItemOpened } from '../lib/analytics';
import { paths } from '../lib/router';
import type { Promo } from '../lib/types';
import { Meta } from './ListingCard';
import { MediaCard, type MediaFace } from './MediaCard';
import { Tags } from './Tags';

export function promoEnds(promo: Promo): string {
  if (promo.endsInDays <= 0) return 'Ends today';
  if (promo.endsInDays === 1) return 'Ends tomorrow';
  return `Ends in ${promo.endsInDays} days`;
}

export function promoWhen(promo: Promo): string {
  return promo.startsInDays > 0
    ? `Starts in ${promo.startsInDays} days`
    : promoEnds(promo);
}

export function promoFace(promo: Promo, mixed = false): MediaFace {
  return {
    href: paths.promo(promo.id),
    photo: promo.photo,
    title: promo.title,
    tag: promo.category,
    meta: (
      <>
        <Meta icon="clock">{promoWhen(promo)}</Meta>
        {promo.merchant && <Meta icon="org">{promo.merchant}</Meta>}
      </>
    ),
    tags: (
      <Tags section={mixed ? 'promo' : undefined} names={[promo.category]} />
    ),
    figure: promo.offer,
  };
}

export function PromoCard({
  promo,
  mixed = false,
}: {
  promo: Promo;
  mixed?: boolean;
}) {
  return (
    <MediaCard
      {...promoFace(promo, mixed)}
      onClick={(e) =>
        trackItemOpened(e.currentTarget, itemRef.promo(promo), 'card')
      }
    />
  );
}
