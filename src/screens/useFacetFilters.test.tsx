import { describe, expect, it } from 'vitest';
import { facetPicksOf } from './useFacetFilters';

describe('facet picks from the address bar', () => {
  it('ignores marketing and paging params', () => {
    const query = new URLSearchParams(
      'utm_source=x&utm_medium=y&utm_campaign=z&fbclid=1&gclid=2&ref=a&s=b&sort=soonest&page=2&q=jazz',
    );
    expect(facetPicksOf(query)).toEqual({});
  });

  it('keeps known facets', () => {
    const query = new URLSearchParams('state=Online&type=music&utm_source=x');
    expect(facetPicksOf(query)).toEqual({ state: 'Online', type: 'music' });
  });

  it('reads a legacy city link as the location facet', () => {
    expect(facetPicksOf(new URLSearchParams('city=Lagos'))).toEqual({
      state: 'Lagos',
    });
    expect(facetPicksOf(new URLSearchParams('city=Lagos&state=Oyo'))).toEqual({
      state: 'Oyo',
    });
  });
});
