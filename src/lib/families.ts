import type { Listing } from './types';

const FILLER = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'in',
  'of',
  'on',
  'or',
  's',
  'the',
  'to',
  'with',
]);
const SAME_WORDS = 0.75;
const FEWEST_SHARED_WORDS = 3;

const wordCache = new WeakMap<Listing, { title: string; words: Set<string> }>();

function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/programme/g, 'program')
      .split(/[^a-z0-9]+/)
      .filter((word) => word && !/^\d+$/.test(word) && !FILLER.has(word)),
  );
}

function wordsOf(listing: Listing): Set<string> {
  const cached = wordCache.get(listing);
  if (cached?.title === listing.title) return cached.words;
  const words = titleWords(listing.title);
  wordCache.set(listing, { title: listing.title, words });
  return words;
}

function sameThing(first: Set<string>, second: Set<string>): boolean {
  const [smaller, larger] =
    first.size <= second.size ? [first, second] : [second, first];
  const shared = [...smaller].filter((word) => larger.has(word)).length;
  const union = first.size + second.size - shared;
  const contained =
    shared === smaller.size && smaller.size >= FEWEST_SHARED_WORDS;
  return contained || (union > 0 && shared / union >= SAME_WORDS);
}

export function distinctFamilies(
  listings: Listing[],
  alreadyShown: Listing[] = [],
  limit = Infinity,
): Listing[] {
  const kept: { kind: Listing['kind']; words: Set<string> }[] =
    alreadyShown.map((l) => ({ kind: l.kind, words: wordsOf(l) }));
  const distinct: Listing[] = [];
  for (const listing of listings) {
    if (distinct.length >= limit) break;
    const words = wordsOf(listing);
    if (kept.some((k) => k.kind === listing.kind && sameThing(k.words, words)))
      continue;
    kept.push({ kind: listing.kind, words });
    distinct.push(listing);
  }
  return distinct;
}
