// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  consentFor,
  context,
  contextOf,
  positionOf,
  routeProperties,
  track,
} from './analytics';

const DAY = 24 * 60 * 60 * 1000;

describe('consentFor', () => {
  const now = Date.UTC(2026, 10, 14);

  it('is pending until the banner is answered', () => {
    expect(consentFor(null, now)).toBe('pending');
  });

  it('follows the analytics switch', () => {
    const choice = { analytics: true, marketing: false, at: now - DAY };
    expect(consentFor(choice, now)).toBe('granted');
    expect(consentFor({ ...choice, analytics: false }, now)).toBe('denied');
  });

  it('goes back to pending once the choice is a year old', () => {
    const old = { analytics: true, marketing: true, at: now - 400 * DAY };
    expect(consentFor(old, now)).toBe('pending');
  });
});

describe('context', () => {
  it('prefixes keys the way autocapture reads them and drops empty values', () => {
    expect(context({ action: 'directions', item_id: 'e7', none: '' })).toEqual({
      'data-ph-capture-attribute-action': 'directions',
      'data-ph-capture-attribute-item_id': 'e7',
    });
  });
});

describe('contextOf', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('collects attributes up the tree, the nearest one winning', () => {
    document.body.innerHTML = `
      <div data-ph-capture-attribute-area="page" data-ph-capture-attribute-item_id="e7">
        <section data-ph-capture-attribute-area="facts">
          <a id="link" data-ph-capture-attribute-action="directions">Go</a>
        </section>
      </div>`;
    expect(contextOf(document.getElementById('link'))).toEqual({
      action: 'directions',
      area: 'facts',
      item_id: 'e7',
    });
  });

  it('is empty without an element', () => {
    expect(contextOf(null)).toEqual({});
  });
});

describe('positionOf', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('counts only the visible cards in the same area', () => {
    document.body.innerHTML = `
      <section data-ph-capture-attribute-area="this_week">
        <a href="/listing/a"></a>
        <a href="/listing/hidden"></a>
        <a href="/place/b"></a>
      </section>`;
    const links = Array.from(document.querySelectorAll('a'));
    // jsdom has no layout, so give the "visible" links a box by hand.
    for (const a of links)
      if (!a.href.endsWith('hidden'))
        a.getClientRects = () => [{}] as unknown as DOMRectList;
    expect(positionOf(links[0]!)).toBe(1);
    expect(positionOf(links[2]!)).toBe(2);
    expect(positionOf(links[1]!)).toBeUndefined();
  });

  it('has no position outside a named area', () => {
    document.body.innerHTML = '<a href="/listing/a"></a>';
    expect(positionOf(document.querySelector('a')!)).toBeUndefined();
  });
});

describe('routeProperties', () => {
  it('names the listing behind a listing page', () => {
    expect(routeProperties({ page: 'listing', id: 'e7' })).toMatchObject({
      route: 'listing',
      item_kind: 'event',
      item_id: 'e7',
      item_category: 'Theatre',
    });
  });

  it('keeps the id when the listing is unknown', () => {
    expect(routeProperties({ page: 'place', id: 'nope' })).toEqual({
      route: 'place',
      item_id: 'nope',
    });
  });

  it('carries the query on search and the section on feeds', () => {
    expect(routeProperties({ page: 'search', query: 'jazz' })).toEqual({
      route: 'search',
      search_query: 'jazz',
    });
    expect(routeProperties({ page: 'feed', feed: 'places' })).toEqual({
      route: 'feed',
      section: 'places',
    });
  });
});

describe('track', () => {
  it('does nothing before analytics starts', () => {
    expect(() => track('filters_opened', {})).not.toThrow();
  });
});
