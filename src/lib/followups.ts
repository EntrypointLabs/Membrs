/**
 * Some opportunity types are too broad to match on their own, so picking one
 * asks one more required question. Levels come from the opportunity
 * taxonomy; fields are the opportunity categories the backend keeps.
 */
export const LEVELS = ['Undergraduate', 'Masters', 'PhD', 'Postdoc'];

export const FIELDS = [
  'Business',
  'Technology',
  'Education',
  'Research',
  'Health',
  'Agriculture',
  'Climate',
  'Finance',
  'Entrepreneurship',
  'Governance',
  'Career',
  'Design',
];

export interface FollowUp {
  question: string;
  options: string[];
}

export const FOLLOW_UPS: Record<string, FollowUp> = {
  Scholarships: {
    question: 'What level are you studying at?',
    options: LEVELS,
  },
  Fellowships: { question: 'What stage are you at?', options: LEVELS },
  Internships: { question: 'Which field are you in?', options: FIELDS },
  Jobs: { question: 'Which field are you in?', options: FIELDS },
  Grants: { question: 'What is the grant for?', options: FIELDS },
  Accelerators: { question: 'What are you building?', options: FIELDS },
};

/** The picked interests whose required follow-up has no answer yet. */
export function missingFollowUps(
  interests: string[],
  answers: Record<string, string[]>,
): string[] {
  return interests.filter((i) => FOLLOW_UPS[i] && !answers[i]?.length);
}
