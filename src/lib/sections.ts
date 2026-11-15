const HIDDEN = new Set(['places', 'promos']);

const SECTION_OF: Record<string, string> = {
  place: 'places',
  promo: 'promos',
  Places: 'places',
  Promos: 'promos',
  establishments: 'places',
  deals: 'promos',
};

export function shown(section: string): boolean {
  return !HIDDEN.has(SECTION_OF[section] ?? section);
}
