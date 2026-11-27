import { describe, expect, it } from 'vitest';
import {
  cityFacet,
  countryFacet,
  deadlineFacet,
  filtered,
  justAdded,
  knownPicks,
  optionsOf,
  regionFacet,
  rewardFacet,
  sortedBy,
  sortKeyOf,
  typeFacet,
} from './filters';
import { opportunityListing } from './testing';

const reward = (usdValue: string | null) => ({
  minimum: null,
  maximum: usdValue,
  currency: 'USD',
  period: 'oneOff' as const,
  usdValue,
});

const lagosGrant = opportunityListing({
  id: 'a',
  title: 'Lagos Founders Grant',
  category: 'Grants',
  country: 'NG',
  region: 'africa',
  reward: reward('25000'),
  listedAt: '2026-11-01T00:00:00Z',
});
const berlinFellowship = opportunityListing({
  id: 'b',
  title: 'Berlin Fellowship',
  category: 'Fellowships',
  country: 'DE',
  region: 'europe',
  reward: reward('2000'),
  listedAt: '2026-11-10T00:00:00Z',
});
const accraGrant = opportunityListing({
  id: 'c',
  title: 'Accra Climate Grant',
  category: 'Grants',
  country: 'GH',
  region: 'africa',
  reward: null,
  rolling: true,
  deadline: { weekday: '', day: 0, month: '', label: 'No deadline' },
});
const all = [lagosGrant, berlinFellowship, accraGrant];
const facets = [typeFacet, regionFacet, countryFacet, rewardFacet];

describe('feed filters', () => {
  it('keeps only listings carrying every picked value', () => {
    const kept = filtered(all, facets, { type: 'grants', region: 'africa' });
    expect(kept.map((l) => l.id)).toEqual(['a', 'c']);
  });

  it('counts a menu against the other filters, never against itself', () => {
    const picks = { type: 'grants', region: null, country: null, reward: null };
    const regions = optionsOf(regionFacet, all, facets, picks);
    expect(regions).toEqual([{ value: 'africa', label: 'Africa', count: 2 }]);
    const types = optionsOf(typeFacet, all, facets, picks);
    expect(types.map((t) => [t.value, t.count])).toEqual([
      ['grants', 2],
      ['fellowships', 1],
    ]);
  });

  it('keeps a picked value in its menu even when nothing matches it', () => {
    const picks = { type: 'fellowships', country: 'GH' };
    const countries = optionsOf(countryFacet, all, facets, picks);
    expect(countries.find((c) => c.value === 'GH')?.count).toBe(0);
  });

  it('labels an unknown pick with its own text, never an inherited member', () => {
    const regions = optionsOf(regionFacet, all, facets, {
      region: 'constructor',
    });
    expect(regions.find((r) => r.value === 'constructor')?.label).toBe(
      'constructor',
    );
  });

  it('drops a pick no listing carries', () => {
    const picks = knownPicks(all, facets, {
      type: 'old-slug',
      region: 'africa',
    });
    expect(picks).toEqual({
      type: null,
      region: 'africa',
      country: null,
      reward: null,
    });
  });

  it('names a picked type from a listing that has it', () => {
    const types = optionsOf(typeFacet, all, facets, {
      type: 'fellowships',
      country: 'GH',
    });
    expect(types.find((t) => t.value === 'fellowships')?.label).toBe(
      'Fellowships',
    );
  });

  it('matches a reward threshold on the approximate dollar value', () => {
    const kept = filtered(all, facets, { reward: '10000' });
    expect(kept.map((l) => l.id)).toEqual(['a']);
  });

  it('tells rolling intake apart from a fixed deadline', () => {
    const kept = filtered(all, [deadlineFacet], { deadline: 'rolling' });
    expect(kept.map((l) => l.id)).toEqual(['c']);
  });

  it('orders by reward with unpriced listings last', () => {
    expect(sortedBy(all, 'reward').map((l) => l.id)).toEqual(['a', 'b', 'c']);
  });

  it('orders recently added first', () => {
    expect(sortedBy(all, 'recent').map((l) => l.id)[0]).toBe('b');
  });

  it('falls back to soonest for an order this feed does not offer', () => {
    expect(sortKeyOf('reward', ['soonest', 'recent'])).toBe('popular');
  });

  it('groups places by their state, with online listings in one bucket', () => {
    const items = [
      opportunityListing({
        id: 'w',
        city: 'Ife',
        country: 'NG',
        state: 'Osun',
      }),
      opportunityListing({
        id: 'x',
        city: 'Osogbo',
        country: 'NG',
        state: 'Osun',
      }),
      opportunityListing({
        id: 'y',
        city: 'Gbagada Expressway',
        country: 'NG',
        state: 'Lagos',
      }),
      opportunityListing({
        id: 'z',
        city: 'Lagos',
        country: 'NG',
        state: 'Online',
      }),
      opportunityListing({
        id: 'v',
        city: 'Nigeria',
        country: 'NG',
        state: ' ',
      }),
    ];
    expect(optionsOf(cityFacet, items, [cityFacet], {})).toEqual([
      { value: 'Osun', label: 'Osun', count: 2 },
      { value: 'Lagos', label: 'Lagos', count: 1 },
      { value: 'Online', label: 'Online', count: 1 },
    ]);
  });
});

describe('justAdded', () => {
  const now = Date.parse('2026-11-21T12:00:00Z');
  const added = (title: string, listedAt: string) =>
    opportunityListing({ id: title, title, listedAt });

  it('keeps the last seven days, newest first', () => {
    const items = [
      added('two days ago', '2026-11-19T12:00:00Z'),
      added('a month ago', '2026-10-21T12:00:00Z'),
      added('today', '2026-11-21T09:00:00Z'),
    ];
    expect(justAdded(items, now).map((l) => l.title)).toEqual([
      'today',
      'two days ago',
    ]);
  });

  it('leaves out a listing with no date', () => {
    expect(justAdded([added('undated', '')], now)).toEqual([]);
  });
});
