import { describe, expect, it } from 'vitest';
import { feed } from './api';
import { EVENT_VIEWS, OPPORTUNITY_VIEWS } from './views';

describe('views', () => {
  it('put every event in exactly one view', () => {
    for (const l of feed('event')) {
      expect(EVENT_VIEWS.filter((v) => v.test(l))).toHaveLength(1);
    }
  });

  it('put every opportunity in at most one view', () => {
    for (const l of feed('opportunity')) {
      expect(
        OPPORTUNITY_VIEWS.filter((v) => v.test(l)).length,
      ).toBeLessThanOrEqual(1);
    }
  });
});
