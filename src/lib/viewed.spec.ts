import { beforeEach, describe, expect, it } from 'vitest';
import { rememberViewed, viewedStore } from './viewed';

beforeEach(() => viewedStore.reset());

describe('rememberViewed', () => {
  it('puts the latest listing first without repeating it', () => {
    rememberViewed('a');
    rememberViewed('b');
    rememberViewed('a');
    expect(viewedStore.get()).toEqual(['a', 'b']);
  });

  it('keeps at most twenty', () => {
    for (let i = 0; i < 25; i++) rememberViewed(`l${i}`);
    expect(viewedStore.get()).toHaveLength(20);
    expect(viewedStore.get()[0]).toBe('l24');
  });

  it('recovers from a stored value that is not a list', () => {
    viewedStore.set('broken' as unknown as string[]);
    rememberViewed('a');
    expect(viewedStore.get()).toEqual(['a']);
  });
});
