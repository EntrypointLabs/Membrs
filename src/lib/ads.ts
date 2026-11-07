/**
 * Ad pricing. An ad is not a banner: it runs as the first listing in the
 * feed the buyer picks, in the same card as every other listing. Each feed
 * has a day rate in naira and the buyer pays the whole run upfront. Longer runs are cheaper per day. The server recomputes
 * the total from the same table before it opens a checkout, so a tampered
 * total in the browser never reaches Bachs.
 */
export type Placement =
  'Home' | 'Events' | 'Opportunities' | 'Places' | 'Promos';

export const DAY_RATE: Record<Placement, number> = {
  Home: 15000,
  Events: 8000,
  Opportunities: 8000,
  Places: 5000,
  Promos: 5000,
};

/** "First listing on Events", for the bill and the receipt. */
export function placementLabel(placement: Placement): string {
  return `First listing on ${placement}`;
}

export const DURATIONS = [
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '30 days' },
] as const;

/** 10% off two weeks or more, 20% off thirty days or more. */
export function discountRate(days: number): number {
  if (days >= 30) return 0.2;
  if (days >= 14) return 0.1;
  return 0;
}

export interface AdQuote {
  placement: Placement;
  rate: number;
  days: number;
  subtotal: number;
  discount: number;
  total: number;
}

export function isPlacement(value: string): value is Placement {
  return value in DAY_RATE;
}

export function quote(placement: Placement, days: number): AdQuote {
  const rate = DAY_RATE[placement];
  const subtotal = rate * days;
  const discount = Math.round(subtotal * discountRate(days));
  return {
    placement,
    rate,
    days,
    subtotal,
    discount,
    total: subtotal - discount,
  };
}

export function naira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}
