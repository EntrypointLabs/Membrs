import { describe, expect, it } from 'vitest';
import { discountRate, naira, quote } from './ads';

describe('quote', () => {
  it('charges the day rate for short runs', () => {
    expect(quote('Mid-feed banner', 7)).toMatchObject({
      subtotal: 56000,
      discount: 0,
      total: 56000,
    });
  });

  it('takes 10% off two weeks and 20% off thirty days', () => {
    expect(discountRate(14)).toBe(0.1);
    expect(discountRate(30)).toBe(0.2);
    expect(quote('Top banner, home screen', 30).total).toBe(360000);
    expect(quote('Featured listing in a category', 14).total).toBe(63000);
  });
});

describe('naira', () => {
  it('formats with the naira sign and thousands separators', () => {
    expect(naira(63000)).toBe('₦63,000');
  });
});
