import { describe, expect, it } from 'vitest';
import { discountRate, naira, placementLabel, quote } from './ads';

describe('quote', () => {
  it('charges the day rate for short runs', () => {
    expect(quote('Events', 7)).toMatchObject({
      subtotal: 56000,
      discount: 0,
      total: 56000,
    });
  });

  it('takes 10% off two weeks and 20% off thirty days', () => {
    expect(discountRate(14)).toBe(0.1);
    expect(discountRate(30)).toBe(0.2);
    expect(quote('Home', 30).total).toBe(360000);
    expect(quote('Places', 14).total).toBe(63000);
  });
});

describe('naira', () => {
  it('formats with the naira sign and thousands separators', () => {
    expect(naira(63000)).toBe('₦63,000');
  });
});

describe('placementLabel', () => {
  it('names the slot, not a banner', () => {
    expect(placementLabel('Promos')).toBe('First listing on Promos');
  });
});
