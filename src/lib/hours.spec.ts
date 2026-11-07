import { describe, expect, it } from 'vitest';
import { clockLabel, openState, rangeLabel } from './hours';
import type { Place } from './types';

const place = (hours: Place['hours']): Place => ({
  id: 'p',
  name: 'Park',
  type: 'Parks & gardens',
  city: 'Lagos',
  area: 'Ikeja',
  entry: 'Free',
  hours,
  goodFor: [],
  about: '',
  photo: 'p1',
});

const weekdays = place(
  Array.from({ length: 7 }, (_, i) =>
    i < 5 ? { opens: 8.5, closes: 17 } : null,
  ),
);

describe('clockLabel', () => {
  it('drops :00 and keeps half hours', () => {
    expect(clockLabel(17)).toBe('5 PM');
    expect(clockLabel(8.5)).toBe('8:30 AM');
    expect(clockLabel(12)).toBe('12 PM');
    expect(clockLabel(0)).toBe('12 AM');
  });

  it('reads a closed day as Closed', () => {
    expect(rangeLabel(null)).toBe('Closed');
    expect(rangeLabel({ opens: 9, closes: 18 })).toBe('9 AM to 6 PM');
  });
});

describe('openState', () => {
  it('is open inside the hours', () => {
    expect(openState(weekdays, 0, 10).label).toBe('Open now');
  });

  it('warns in the last hour', () => {
    const s = openState(weekdays, 0, 16.25);
    expect(s.closingSoon).toBe(true);
    expect(s.label).toBe('Closing soon');
  });

  it('says when it opens later today', () => {
    expect(openState(weekdays, 0, 7).detail).toBe('Opens 8:30 AM');
  });

  it('looks ahead past closed days', () => {
    expect(openState(weekdays, 4, 18).detail).toBe('Opens Mon 8:30 AM');
    expect(openState(weekdays, 0, 18).detail).toBe('Opens tomorrow 8:30 AM');
  });

  it('copes with a place that never lists hours', () => {
    expect(openState(place(Array(7).fill(null)), 2, 12).detail).toBe(
      'Hours not listed',
    );
  });
});
