import { describe, expect, it } from 'vitest';
import { navSection, parseRoute, paths } from './router';

describe('parseRoute', () => {
  it.each([
    ['/', { page: 'home' }],
    ['/events', { page: 'feed', feed: 'events' }],
    ['/places/categories', { page: 'categories', feed: 'places' }],
    ['/category/music', { page: 'category', slug: 'music' }],
    ['/listing/e2', { page: 'listing', id: 'e2' }],
    ['/place/pl1', { page: 'place', id: 'pl1' }],
    ['/promo/pr1', { page: 'promo', id: 'pr1' }],
    ['/digest', { page: 'digest' }],
    ['/digest/d1', { page: 'issue', id: 'd1' }],
    ['/search?q=jazz%20night', { page: 'search', query: 'jazz night' }],
    ['/cookies', { page: 'legal', doc: 'cookies' }],
    ['/contribute?kind=ad', { page: 'contribute', kind: 'ad' }],
  ])('reads %s', (path, route) => {
    expect(parseRoute(path)).toEqual(route);
  });

  it('falls back to an event form for an unknown contribute kind', () => {
    expect(parseRoute('/contribute?kind=nope')).toEqual({
      page: 'contribute',
      kind: 'event',
    });
  });

  it('never throws on an unknown path', () => {
    expect(parseRoute('/events/nope/deeper')).toEqual({ page: 'not-found' });
    expect(parseRoute('/wat')).toEqual({ page: 'not-found' });
  });

  it('round-trips every path builder', () => {
    expect(parseRoute(paths.issue('d3'))).toEqual({ page: 'issue', id: 'd3' });
    expect(parseRoute(paths.search('a&b'))).toEqual({
      page: 'search',
      query: 'a&b',
    });
    expect(parseRoute(paths.contribute('opportunity'))).toEqual({
      page: 'contribute',
      kind: 'opportunity',
    });
  });
});

describe('navSection', () => {
  it('lights the right tab', () => {
    expect(navSection(parseRoute('/places/categories'))).toBe('places');
    expect(navSection(parseRoute('/digest/d1'))).toBe('digest');
    expect(navSection(parseRoute('/privacy'))).toBeNull();
  });
});
