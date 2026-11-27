// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { forYou, interestMatches } from './api';
import { cityStore, interestsStore, readerLinkStore } from './preferences';
import { adoptReaderLink, readerLinkOf, withoutReaderLink } from './readerLink';
import { eventListing, opportunityListing } from './testing';

describe('a personalised link from the email', () => {
  beforeEach(() => {
    interestsStore.reset();
    readerLinkStore.reset();
    cityStore.reset();
    window.history.replaceState(null, '', '/');
  });

  it('reads the interest slugs back into their labels', () => {
    expect(readerLinkOf('?for=music,art-design,jobs&in=Lagos')).toEqual({
      interests: ['Music', 'Art & Design', 'Jobs'],
      city: 'Lagos',
    });
  });

  it('refuses an overlong or control-laden city', () => {
    expect(readerLinkOf(`?in=${'x'.repeat(65)}`)).toBeNull();
    expect(readerLinkOf('?in=La%00gos')?.city).toBe('Lagos');
  });

  it('ignores an eligibility country that shares the for parameter', () => {
    expect(readerLinkOf('?for=NG')).toBeNull();
    expect(
      withoutReaderLink('/opportunities?for=NG&in=Lagos', {
        interests: [],
        city: 'Lagos',
      }),
    ).toBe('/opportunities?for=NG');
  });

  it('remembers the picks and strips them from the address bar', () => {
    window.history.replaceState(
      null,
      '',
      '/events?city=Lagos&view=week&for=music,grants&in=Abuja',
    );
    adoptReaderLink();
    expect(interestsStore.get()).toEqual(['Music', 'Grants']);
    expect(readerLinkStore.get()).toBe(true);
    expect(window.location.pathname + window.location.search).toBe(
      '/events?city=Lagos&view=week',
    );
  });

  it('leaves a plain visit alone', () => {
    window.history.replaceState(null, '', '/?kind=event');
    adoptReaderLink();
    expect(readerLinkStore.get()).toBe(false);
    expect(window.location.search).toBe('?kind=event');
  });

  it('matches listings by kind and category, as the for-you endpoint does', () => {
    const pool = [
      eventListing({ id: 'gig', category: 'Music' }),
      eventListing({ id: 'talk', category: 'Tech' }),
      opportunityListing({ id: 'grant', category: 'Grants' }),
      opportunityListing({ id: 'job', category: 'Jobs' }),
    ];
    const ids = interestMatches(['Music', 'Grants'], pool);
    expect(ids.sort()).toEqual(['gig', 'grant']);
    expect(forYou(ids, pool).map((l) => l.id)).toEqual(['gig', 'grant']);
  });
});
