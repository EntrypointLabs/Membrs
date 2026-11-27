import { describe, expect, it } from 'vitest';
import { categories, homePath, type HomeParams } from './api';

const READER: HomeParams = {
  layout: 'web',
  country: 'NG',
  state: 'Lagos',
  viewed: [],
};

describe('catalogue', () => {
  it('carries the categories', () => {
    expect(categories().length).toBeGreaterThan(0);
  });
});

describe('homePath', () => {
  it('leaves default tabs out, so the first visit and the prefetch share one address', () => {
    expect(
      homePath({ ...READER, popular: 'all', range: 'week', weekKind: 'all' }),
    ).toBe(homePath(READER));
    expect(homePath(READER)).toBe(
      '/v1/listings/home?layout=web&country=NG&state=Lagos',
    );
  });

  it('asks for one section page by id and window', () => {
    expect(
      homePath(
        { ...READER, near: 'Ikeja', around: ['Ikeja', 'Yaba'] },
        { id: 'nearby', offset: 12, limit: 12, category: 'Music' },
      ),
    ).toBe(
      '/v1/listings/home?layout=web&country=NG&state=Lagos&near=Ikeja&around=Ikeja%2CYaba&section=nearby&offset=12&limit=12&category=Music',
    );
  });
});
