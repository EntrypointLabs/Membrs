// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { homePath } from './api';
import { homeParamsOf, readerNow } from './homeParams';
import { cityStore, interestsStore, readerLinkStore } from './preferences';
import { adoptReaderLink, readerLinkOf, withoutReaderLink } from './readerLink';

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

  it('sends the linked interests with the first home request', () => {
    window.history.replaceState(
      null,
      '',
      '/?for=music,grants,beaches&in=Lagos',
    );
    adoptReaderLink();
    const path = homePath(homeParamsOf(false, readerNow()));
    expect(new URLSearchParams(path.split('?')[1]).get('interests')).toBe(
      'event:Music,opportunity:Grants',
    );
    expect(window.location.search).toBe('');
  });

  it('keeps the default picks out of a plain visit', () => {
    expect(homeParamsOf(false, readerNow()).interests).toEqual([]);
  });
});
