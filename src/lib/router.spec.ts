import { describe, expect, it } from 'vitest';
import { navSection, parseRoute, paths } from './router';

describe('parseRoute', () => {
  it.each([
    ['/', { page: 'home' }],
    ['/events', { page: 'feed', feed: 'events' }],
    [
      '/opportunities/categories',
      { page: 'categories', feed: 'opportunities' },
    ],
    ['/category/music', { page: 'category', slug: 'music' }],
    ['/listing/e2', { page: 'listing', id: 'e2' }],
    ['/digest', { page: 'not-found' }],
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

  it('treats a malformed escape as not found instead of throwing', () => {
    expect(parseRoute('/listing/%E0%A4%A')).toEqual({ page: 'not-found' });
    expect(parseRoute('/category/%')).toEqual({ page: 'not-found' });
  });

  it('round-trips every path builder', () => {
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
    expect(navSection(parseRoute('/events/categories'))).toBe('events');
    expect(navSection(parseRoute('/opportunities'))).toBe('opportunities');
    expect(navSection(parseRoute('/privacy'))).toBeNull();
  });
});
