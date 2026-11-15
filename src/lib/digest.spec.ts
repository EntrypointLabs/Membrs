import { describe, expect, it } from 'vitest';
import { interestPicks, launchCities, taxonomy } from './api';
import { digestCities } from './digest';

const BACKEND_INTEREST_OPTIONS = {
  event: [
    'Music',
    'Nightlife',
    'Tech',
    'Art & Design',
    'Food & Drink',
    'Comedy',
    'Sports & Fitness',
    'Wellness',
    'Networking',
    'Festivals',
  ],
  opportunity: [
    'Grants',
    'Fellowships',
    'Scholarships',
    'Jobs',
    'Internships',
    'Accelerators',
    'Hackathons',
  ],
  place: ['Beaches', 'Parks & gardens', 'Museums & galleries', 'Libraries'],
};

describe('picks card interests', () => {
  it('offers exactly what catalogue.InterestOptions accepts', () => {
    expect(taxonomy().onboardingInterests).toEqual(BACKEND_INTEREST_OPTIONS);
  });

  it('sends every card interest under its backend kind', () => {
    const offered = taxonomy().onboardingInterests;
    for (const kind of ['event', 'opportunity', 'place'] as const)
      expect(interestPicks(offered[kind])).toEqual(
        BACKEND_INTEREST_OPTIONS[kind].map((category) => ({ kind, category })),
      );
  });
});

describe('digestCities', () => {
  const live = launchCities()
    .filter((c) => c.status === 'live')
    .map((c) => c.name);

  it('offers only live cities', () => {
    expect(live.length).toBeGreaterThan(0);
    expect(digestCities()).toEqual(live);
    expect(digestCities(live[0])).toEqual(live);
    for (const gone of ['Johannesburg', 'Cairo', 'Kigali', 'Dakar', 'Nairobi'])
      expect(digestCities()).not.toContain(gone);
  });

  it('keeps a saved digest city so it shows selected', () => {
    expect(digestCities('Port Harcourt')).toEqual([...live, 'Port Harcourt']);
  });
});
