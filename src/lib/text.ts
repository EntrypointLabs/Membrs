/**
 * New York Times title case: every word capitalised except short articles,
 * conjunctions and prepositions, which stay lower case unless they open or
 * close the title. Headings across membrs go through this so copy written in
 * sentence case still reads as a headline.
 */
const MINOR_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'en',
  'for',
  'if',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'per',
  'the',
  'to',
  'vs',
  'via',
]);

export function titleCase(input: string): string {
  const words = input.split(' ');
  return words
    .map((word, i) => {
      if (!word) return word;
      const lower = word.toLowerCase();
      const edge = i === 0 || i === words.length - 1;
      if (!edge && MINOR_WORDS.has(lower)) return lower;
      // Leave words that already carry capitals inside them alone: MUSON,
      // iPhone, DevFest, ₦15,000.
      if (/[A-Z]/.test(word.slice(1)) || !/^[a-z]/i.test(word)) return word;
      return word[0]!.toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/** URL-safe slug: "Art & Design" becomes "art-design". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Singular or plural: plural(1, 'event') is "1 event". */
export function plural(n: number, noun: string, many = `${noun}s`): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? noun : many}`;
}
