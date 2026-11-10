/**
 * Category colours, as [light-mode, dark-mode] pairs. The dark tint is the
 * lighter of the two so a kicker stays legible on the dark surface. Anything
 * without an entry falls back to the neutral foreground.
 */
export const CATEGORY_COLORS: Record<string, readonly [string, string]> = {
  Events: ['#d24d42', '#fda296'],
  Opportunities: ['#8568db', '#bfb1ff'],
  Places: ['#02985f', '#6cd79d'],
  Music: ['#bd50a3', '#f49cdb'],
  Nightlife: ['#9860d0', '#d0a9fe'],
  Tech: ['#2a80e2', '#92c1fd'],
  'Art & Design': ['#d24c50', '#fda19e'],
  Film: ['#cd4a78', '#fe9cb8'],
  'Food & Drink': ['#c3610d', '#fda670'],
  Fashion: ['#c84c8b', '#fd9ac6'],
  Comedy: ['#99740e', '#e4b750'],
  'Sports & Fitness': ['#3e9727', '#90d281'],
  Wellness: ['#11957c', '#49d9b9'],
  Networking: ['#138db1', '#49cffc'],
  Business: ['#5a76e4', '#a4bbff'],
  Faith: ['#a56d0f', '#f1af57'],
  Gaming: ['#8169dd', '#bcb2fd'],
  'Books & Talks': ['#d05320', '#fda485'],
  Theatre: ['#d14a65', '#fe9eaa'],
  Family: ['#798205', '#bbc75f'],
  Festivals: ['#b0660c', '#f9aa60'],
  Grants: ['#0c994f', '#78d694'],
  Fellowships: ['#4d79e4', '#9ebdff'],
  Scholarships: ['#0e89c4', '#75c8fc'],
  Jobs: ['#0f919c', '#2ad5e5'],
  Internships: ['#17938b', '#32d8cd'],
  Accelerators: ['#d25030', '#fea28b'],
  Hackathons: ['#8a66d9', '#c3b0fd'],
  Competitions: ['#d24b58', '#fda0a3'],
  Residencies: ['#b654b0', '#ed9ee5'],
  Bounties: ['#8b7b02', '#d1bf53'],
  Volunteering: ['#599305', '#9ecf75'],
  'Calls for Speakers': ['#c0640c', '#fea668'],
  Awards: ['#a17003', '#ebb353'],
  Beaches: ['#158eab', '#40d1f7'],
  'Parks & gardens': ['#36982d', '#8cd384'],
  Libraries: ['#cf5604', '#fea47c'],
  'Amusement parks': ['#c74c8e', '#fc9ac9'],
  'Water parks': ['#0d9296', '#28d7dc'],
  'Zoos & wildlife': ['#aa6a08', '#f5ad5a'],
  'Museums & galleries': ['#736ee1', '#b3b6fd'],
  'Lakes & nature': ['#089772', '#58d8ae'],
  Promos: ['#cd4686', '#fd9bc2'],
  Restaurants: ['#c95b0a', '#fda578'],
  Shopping: ['#a959c1', '#e1a2f4'],
  'Fashion & Beauty': ['#d14a65', '#fe9eaa'],
  'Tech & Gadgets': ['#0584da', '#86c4fe'],
  'Travel & Stays': ['#1790a3', '#32d3ee'],
  Groceries: ['#4f950f', '#99d079'],
  Entertainment: ['#796ce0', '#b6b4ff'],
  'Services & Apps': ['#059488', '#37d8c9'],
};

/**
 * Opportunity sectors, the second tag on an opportunity. Pastel fills only,
 * because a sector only ever appears as a filled tag.
 */
export const SECTOR_COLORS: Record<string, string> = {
  Health: '#ff9fb0',
  Education: '#8ec9ff',
  Research: '#c3a6ff',
  Agriculture: '#a8d977',
  Climate: '#7fe0c0',
  Finance: '#f5c76b',
  Entrepreneurship: '#ffa98a',
  Governance: '#a9b8ff',
  Career: '#ffd27a',
  Design: '#e6a6f0',
  Technology: '#7fb2ff',
  Business: '#a4bbff',
};

/** What each section is called on a tag, and whose colour it borrows. */
export const SECTION_TAGS = {
  event: ['Event', 'Events'],
  opportunity: ['Opportunity', 'Opportunities'],
  place: ['Place', 'Places'],
  promo: ['Promo', 'Promos'],
} as const;

/**
 * The fill for a tag. Categories use the light half of their pair, sectors
 * their own pastel, and anything unknown a stable pastel from its name.
 */
export function tagFill(name: string): string {
  const section = Object.values(SECTION_TAGS).find(([label]) => label === name);
  const pair = CATEGORY_COLORS[section ? section[1] : name];
  if (pair) return pair[1];
  if (SECTOR_COLORS[name]) return SECTOR_COLORS[name];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 80% 78%)`;
}
