import type { Promo } from '../lib/types';
import { MediaRow } from './MediaRow';
import { promoFace } from './PromoCard';

export function PromoRow({ promo }: { promo: Promo }) {
  return <MediaRow {...promoFace(promo)} />;
}
