import type { ListingSummary, Place, Promo } from './types';

export type SearchHit =
  | { kind: 'listing'; item: ListingSummary; score: number }
  | { kind: 'place'; item: Place; score: number }
  | { kind: 'promo'; item: Promo; score: number };
