import type { CSSProperties } from 'react';
import { SECTION_TAGS, tagFill } from '../lib/palette';
import type { ListingSummary } from '../lib/types';

type Section = keyof typeof SECTION_TAGS;

/**
 * One filled tag: a category, a sector or a section, in its own colour.
 * Small, because a card usually carries two side by side.
 */
export function Tag({ name }: { name: string }) {
  return (
    <span
      className="rounded-tag inline-flex h-[22px] max-w-full items-center truncate bg-(--tag) px-2 text-[12px] leading-none font-semibold whitespace-nowrap text-[#141414]"
      style={{ '--tag': tagFill(name) } as CSSProperties}
    >
      {name}
    </span>
  );
}

interface TagsProps {
  section?: Section;
  names: (string | null | undefined)[];
  className?: string;
}

export function Tags({ section, names, className = '' }: TagsProps) {
  const cats = cardTags(undefined, names);
  const all = cardTags(section, names);
  return (
    <span
      className={`inline-flex max-w-full min-w-0 flex-wrap items-center gap-1.5 ${className}`}
    >
      <span className="inline-flex max-w-full min-w-0 flex-wrap items-center gap-1.5 md:hidden">
        {cats.map((n) => (
          <Tag key={n} name={n} />
        ))}
      </span>
      <span className="hidden max-w-full min-w-0 flex-wrap items-center gap-1.5 md:inline-flex">
        {all.map((n) => (
          <Tag key={n} name={n} />
        ))}
      </span>
    </span>
  );
}

export function cardTags(
  section: Section | undefined,
  names: (string | null | undefined)[],
): string[] {
  const cats = names.filter((n): n is string => Boolean(n));
  return (section ? [SECTION_TAGS[section][0], ...cats] : cats).slice(0, 2);
}

/** The names a listing is tagged with: its category, and an opportunity's sector. */
export function listingTags(listing: ListingSummary): string[] {
  return listing.kind === 'opportunity' && listing.sector
    ? [listing.category, listing.sector]
    : [listing.category];
}
