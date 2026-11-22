import { describe, expect, it } from 'vitest';
import { placement } from './placement';
import { eventListing } from './testing';

const ids = (list: { id: string }[]) => list.map((l) => l.id);

describe('placement', () => {
  it('never hands out a listing an earlier section took', () => {
    const [a, b, c] = ['a', 'b', 'c'].map((id) => eventListing({ id }));
    const page = placement([a!]);
    expect(ids(page.take([a!, b!]))).toEqual(['b']);
    expect(ids(page.take([a!, b!, c!]))).toEqual(['c']);
    expect(ids(page.placed())).toEqual(['a', 'b', 'c']);
  });

  it('only claims what fits under the limit', () => {
    const list = ['a', 'b', 'c'].map((id) => eventListing({ id }));
    const page = placement();
    expect(ids(page.take(list, 2))).toEqual(['a', 'b']);
    expect(ids(page.take(list))).toEqual(['c']);
  });
});
