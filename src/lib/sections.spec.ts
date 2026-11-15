import { describe, expect, it } from 'vitest';
import { contributeForm } from './api';
import { parseRoute } from './router';
import { shown } from './sections';

describe('hidden sections', () => {
  it('hides places and promos under every name they go by', () => {
    for (const name of [
      'places',
      'promos',
      'place',
      'promo',
      'Places',
      'Promos',
      'establishments',
      'deals',
    ])
      expect(shown(name)).toBe(false);
    for (const name of [
      'events',
      'opportunities',
      'home',
      'contribute',
      'ad',
      'Home',
      'listing',
    ])
      expect(shown(name)).toBe(true);
  });

  it('routes hidden pages to not found and hidden contribute kinds to events', () => {
    expect(parseRoute('/places')).toEqual({ page: 'not-found' });
    expect(parseRoute('/promos/categories')).toEqual({ page: 'not-found' });
    expect(parseRoute('/place/abc')).toEqual({ page: 'not-found' });
    expect(parseRoute('/promo/abc')).toEqual({ page: 'not-found' });
    expect(parseRoute('/contribute?kind=promo')).toEqual({
      page: 'contribute',
      kind: 'event',
    });
    expect(parseRoute('/events')).toEqual({ page: 'feed', feed: 'events' });
  });

  it('drops hidden sections from the ad placements', () => {
    const placements = contributeForm('ad').fields.find(
      (f) => f.name === 'cat',
    )?.options;
    expect(placements).toEqual(['Home', 'Events', 'Opportunities']);
  });
});
