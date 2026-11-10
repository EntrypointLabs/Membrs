import { describe, expect, it } from 'vitest';
import { FOLLOW_UPS, missingFollowUps } from './followups';

describe('missingFollowUps', () => {
  it('asks for every picked type that has a question and no answer', () => {
    expect(missingFollowUps(['Music', 'Scholarships', 'Jobs'], {})).toEqual([
      'Scholarships',
      'Jobs',
    ]);
  });

  it('is satisfied once each question has at least one answer', () => {
    expect(
      missingFollowUps(['Scholarships'], { Scholarships: ['Masters'] }),
    ).toEqual([]);
  });

  it('never asks about types without a question', () => {
    expect(FOLLOW_UPS.Hackathons).toBeUndefined();
    expect(missingFollowUps(['Hackathons'], {})).toEqual([]);
  });
});
