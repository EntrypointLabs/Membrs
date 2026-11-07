import type { Listing, Place, Promo } from './types';

/**
 * Search across everything membrs lists. It is a plain token match with a
 * little weighting, not a search engine: titles count most, then category and
 * city, then the blurb. Good enough for a few hundred listings, and easy to
 * swap for an API call later.
 */
export type SearchHit =
  | { kind: 'listing'; item: Listing; score: number }
  | { kind: 'place'; item: Place; score: number }
  | { kind: 'promo'; item: Promo; score: number };

function tokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9₦]+/)
    .filter((t) => t.length > 1);
}

function score(query: string[], fields: [string, number][]): number {
  let total = 0;
  for (const token of query) {
    let best = 0;
    for (const [text, weight] of fields) {
      if (text.toLowerCase().includes(token)) best = Math.max(best, weight);
    }
    // Every word has to land somewhere, or the item is not a match.
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

export function search(
  query: string,
  data: { listings: Listing[]; places: Place[]; promos: Promo[] },
): SearchHit[] {
  const q = tokens(query);
  if (q.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const item of data.listings) {
    const s = score(q, [
      [item.title, 5],
      [item.category, 3],
      [item.city, 3],
      [item.organiser, 2],
      [
        item.kind === 'event'
          ? `${item.venue} ${item.area} ${item.price}`
          : item.award,
        2,
      ],
      [item.blurb, 1],
    ]);
    if (s) hits.push({ kind: 'listing', item, score: s });
  }
  for (const item of data.places) {
    const s = score(q, [
      [item.name, 5],
      [item.type, 3],
      [`${item.city} ${item.area}`, 3],
      [item.goodFor.join(' '), 2],
      [item.about, 1],
    ]);
    if (s) hits.push({ kind: 'place', item, score: s });
  }
  for (const item of data.promos) {
    const s = score(q, [
      [item.title, 5],
      [`${item.merchant} ${item.category}`, 3],
      [item.city, 3],
      [item.blurb, 1],
    ]);
    if (s) hits.push({ kind: 'promo', item, score: s });
  }
  return hits.sort((a, b) => b.score - a.score);
}
