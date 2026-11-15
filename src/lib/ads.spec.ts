import { describe, expect, it } from 'vitest';
import {
  DAY_RATE,
  discountRate,
  earliestStart,
  naira,
  placementLabel,
  quote,
  runDays,
} from './ads';

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

describe('quote across a run', () => {
  it('never charges more for a shorter run', () => {
    for (const placement of Object.keys(DAY_RATE) as (keyof typeof DAY_RATE)[])
      for (let days = 1; days < 90; days++)
        expect(quote(placement, days).total).toBeLessThanOrEqual(
          quote(placement, days + 1).total,
        );
  });

  it('caps 13 days at the 14 day price and 29 at the 30 day price', () => {
    expect(quote('Home', 13).total).toBe(quote('Home', 14).total);
    expect(quote('Home', 29).total).toBe(quote('Home', 30).total);
    expect(quote('Home', 13).discount).toBe(195000 - 189000);
  });

  it('leaves the preset runs at the server price', () => {
    expect(quote('Home', 3).total).toBe(45000);
    expect(quote('Home', 7).total).toBe(105000);
    expect(quote('Home', 14).total).toBe(189000);
  });
});

describe('runDays', () => {
  it('takes whole days and clamps to the longest run', () => {
    expect(runDays('10')).toBe(10);
    expect(runDays(' 1 ')).toBe(1);
    expect(runDays('1000')).toBe(90);
  });

  it('refuses empty, zero, negative and fractional days', () => {
    expect(runDays('')).toBeNull();
    expect(runDays('0')).toBeNull();
    expect(runDays('-3')).toBeNull();
    expect(runDays('2.5')).toBeNull();
  });
});

describe('earliestStart', () => {
  it('allows two working days for review', () => {
    expect(earliestStart(new Date(2026, 10, 16, 9))).toBe('2026-11-18');
    expect(earliestStart(new Date(2026, 10, 13, 9))).toBe('2026-11-17');
    expect(earliestStart(new Date(2026, 10, 14, 19))).toBe('2026-11-17');
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
