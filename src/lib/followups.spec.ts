import { describe, expect, it } from 'vitest';
import {
  asksField,
  digestFields,
  FIELD_INTERESTS,
  FIELDS,
  fieldsFromDigest,
} from './followups';
import { interestsStore } from './preferences';
import { interestPicks, taxonomy } from './api';

const BACKEND_CATEGORIES = [
  'business',
  'technology',
  'education',
  'research',
  'health',
  'agriculture',
  'climate',
  'finance',
  'entrepreneurship',
  'arts',
  'music',
  'film',
  'sports',
  'faith',
  'community',
  'governance',
  'media',
  'design',
  'career',
  'food',
  'nightlife',
  'family',
  'wellness',
  'comedy',
  'gaming',
  'fashion',
  'outdoors',
  'literature',
  'other',
];

describe('field follow-up', () => {
  it('is only asked by opportunity types the card offers', () => {
    const offered = taxonomy().onboardingInterests.opportunity;
    expect(FIELD_INTERESTS.every((i) => offered.includes(i))).toBe(true);
    expect(asksField(['Music', 'Jobs'])).toBe(true);
    expect(asksField(['Music', 'Scholarships'])).toBe(false);
  });

  it('sends every field as a newsletter category the backend accepts', () => {
    const sent = digestFields(['Jobs'], FIELDS);
    expect(sent).toHaveLength(FIELDS.length);
    expect(sent.every((s) => BACKEND_CATEGORIES.includes(s))).toBe(true);
  });

  it('sends no fields when nothing picked asks for one', () => {
    expect(digestFields(['Music'], ['Business'])).toEqual([]);
  });

  it('round trips the saved digest categories back into fields', () => {
    expect(
      fieldsFromDigest(digestFields(['Grants'], ['Design', 'Business'])),
    ).toEqual(['Business', 'Design']);
    expect(fieldsFromDigest(['music', 'climate'])).toEqual(['Climate']);
  });
});

describe('defaults', () => {
  it('never block saving: every default interest is sent as is', () => {
    const defaults = interestsStore.get();
    expect(defaults.length).toBeGreaterThan(0);
    expect(interestPicks(defaults).map((p) => p.category)).toEqual(defaults);
    expect(digestFields(defaults, [])).toEqual([]);
  });
});

describe('interestPicks', () => {
  it('keeps the first three event picks, two opportunity picks and every place', () => {
    const picks = interestPicks([
      'Music',
      'Nightlife',
      'Tech',
      'Comedy',
      'Festivals',
      'Grants',
      'Fellowships',
      'Scholarships',
      'Jobs',
      'Internships',
      'Beaches',
      'Parks & gardens',
      'Museums & galleries',
      'Libraries',
    ]);
    expect(
      picks.filter((p) => p.kind === 'event').map((p) => p.category),
    ).toEqual(['Music', 'Nightlife', 'Tech']);
    expect(picks.filter((p) => p.kind === 'opportunity')).toHaveLength(2);
    expect(picks.filter((p) => p.kind === 'place')).toHaveLength(4);
  });
});
