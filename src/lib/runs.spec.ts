import { describe, expect, it } from 'vitest';
import { collapsedRuns } from './runs';
import { eventListing, opportunityListing } from './testing';

describe('collapsedRuns', () => {
  it('shows a show running several nights once, from its first night', () => {
    const night = (id: string, day: number) =>
      eventListing({
        id,
        title: 'Davido ORIADÉ: The Residency',
        city: 'Lagos',
        inDays: day,
        date: { weekday: 'Thu', day, month: 'Dec' },
      });
    const opportunity = opportunityListing({ id: 'o' });
    const shown = collapsedRuns([
      night('b', 18),
      opportunity,
      night('a', 17),
      night('c', 19),
    ]);
    expect(shown.map((l) => l.id)).toEqual(['a', 'o']);
    const run = shown[0];
    expect(run?.kind === 'event' && run.runLength).toBe(3);
    expect(run?.kind === 'event' && run.runUntil?.day).toBe(19);
  });

  it('keeps the same show in two cities apart', () => {
    const lagos = eventListing({ id: 'l', city: 'Lagos' });
    const accra = eventListing({ id: 'a', city: 'Accra' });
    expect(collapsedRuns([lagos, accra])).toHaveLength(2);
  });
});
