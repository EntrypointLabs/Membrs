import { describe, expect, it } from 'vitest';
import { isChoiceCurrent } from './cookies';

describe('isChoiceCurrent', () => {
  it('asks again when there is no choice', () => {
    expect(isChoiceCurrent(null)).toBe(false);
  });

  it('keeps a choice for twelve months', () => {
    const now = Date.UTC(2026, 10, 5);
    const choice = { analytics: false, marketing: false, at: now };
    expect(isChoiceCurrent(choice, now + 1000)).toBe(true);
    expect(isChoiceCurrent(choice, now + 366 * 24 * 60 * 60 * 1000)).toBe(
      false,
    );
  });
});
