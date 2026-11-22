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

export function hashOf(text: string, buckets: number): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % buckets;
  return h;
}

export function daysLeftLine(days: number): string {
  if (days <= 0) return 'Closes today';
  return `${plural(days, 'day')} left`;
}

const SOURCE_NAMES: Record<string, string> = {
  eventbrite: 'Eventbrite',
  luma: 'Luma',
  meetup: 'Meetup',
  nairabox: 'Nairabox',
  ticketmaster: 'Ticketmaster',
  tivavo: 'Tivavo',
  tix: 'Tix',
  membrs: 'MEMBRS',
};

export function sourceName(source: string): string {
  const name = source.trim();
  const key = name.toLowerCase();
  const known = Object.hasOwn(SOURCE_NAMES, key)
    ? SOURCE_NAMES[key]
    : undefined;
  if (known) return known;
  return name === name.toLowerCase() && name
    ? name[0]!.toUpperCase() + name.slice(1)
    : name;
}

const PER: [RegExp, string][] = [
  [/\s+(?:a|per)\s+month\b|\s+monthly\b/gi, '/mo'],
  [/\s+(?:a|per)\s+year\b|\s+annually\b|\s+yearly\b/gi, '/yr'],
  [/\s+(?:a|per)\s+week\b|\s+weekly\b/gi, '/wk'],
  [/\s+(?:a|per)\s+day\b|\s+daily\b/gi, '/day'],
];

const SCALES: [number, string][] = [
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

export function shortAmount(amount: number): string {
  for (const [index, [size, suffix]] of SCALES.entries()) {
    if (amount < size) continue;
    const scaled = amount / size;
    const rounded =
      scaled < 10 ? Math.round(scaled * 10) / 10 : Math.round(scaled);
    const bigger = SCALES[index - 1];
    return rounded >= 1000 && bigger ? `1${bigger[1]}` : `${rounded}${suffix}`;
  }
  return String(amount);
}

export function priceText(price: string): string {
  const shortened = price.replace(
    /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{4,}(?:\.\d+)?/g,
    (amount) => shortAmount(Number(amount.replaceAll(',', ''))),
  );
  return PER.reduce(
    (text, [pattern, unit]) => text.replace(pattern, unit),
    shortened,
  ).replace(
    /(\d)\.(\d)(?![\dKMB])/g,
    (_, whole: string, tenth: string) => `${whole}.${tenth}0`,
  );
}

export function distinctParts(lead: string, parts: string[]): string[] {
  const seen = [lead.toLowerCase()];
  return parts.filter((part) => {
    const text = part.trim().toLowerCase();
    if (!text || seen.some((s) => s.includes(text))) return false;
    seen.push(text);
    return true;
  });
}
