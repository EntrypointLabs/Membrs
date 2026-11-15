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

export const FIELD_INTERESTS = [
  'Internships',
  'Jobs',
  'Grants',
  'Accelerators',
];

export const FIELD_QUESTION = 'Which fields are you in?';

export function asksField(interests: string[]): boolean {
  return interests.some((i) => FIELD_INTERESTS.includes(i));
}

export function digestFields(interests: string[], fields: string[]): string[] {
  if (!asksField(interests)) return [];
  return FIELDS.filter((f) => fields.includes(f)).map((f) => f.toLowerCase());
}

export function fieldsFromDigest(slugs: string[]): string[] {
  const saved = slugs.map((s) => s.toLowerCase());
  return FIELDS.filter((f) => saved.includes(f.toLowerCase()));
}
