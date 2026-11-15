import { describe, expect, it } from 'vitest';
import { CALLBACK_PATH, safeReturnPath } from './auth';

describe('safeReturnPath', () => {
  it('returns the reader to the page they left', () => {
    expect(safeReturnPath('/contribute?kind=ad')).toBe('/contribute?kind=ad');
    expect(safeReturnPath('/listing/abc')).toBe('/listing/abc');
  });

  it('only ever lands on this site', () => {
    expect(safeReturnPath('//evil.test/x')).toBe('/');
    expect(safeReturnPath('https://evil.test')).toBe('/');
    expect(safeReturnPath('/\\evil.test')).toBe('/');
    expect(safeReturnPath(null)).toBe('/');
    expect(safeReturnPath(`${CALLBACK_PATH}?code=1`)).toBe('/');
  });
});
