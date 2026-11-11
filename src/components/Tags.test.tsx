import { describe, expect, it } from 'vitest';
import { cardTags } from './Tags';

describe('cardTags', () => {
  it('keeps the section and the category when there are more', () => {
    expect(cardTags('opportunity', ['Grants', 'Health'])).toEqual([
      'Opportunity',
      'Grants',
    ]);
  });

  it('keeps two categories when there is no section', () => {
    expect(cardTags(undefined, ['Grants', 'Health', 'Tech'])).toEqual([
      'Grants',
      'Health',
    ]);
  });

  it('drops empty names', () => {
    expect(cardTags('event', [null, 'Music'])).toEqual(['Event', 'Music']);
  });
});
