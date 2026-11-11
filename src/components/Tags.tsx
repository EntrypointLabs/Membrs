import type { CSSProperties } from 'react';
import { SECTION_TAGS, tagFill } from '../lib/palette';
import type { Listing } from '../lib/types';

type Section = keyof typeof SECTION_TAGS;

/**
 * One filled tag: a category, a sector or a section, in its own colour.
 * Small, because a card usually carries two side by side.
 */
export function Tag({ name }: { name: string }) {
  return (
    <span
      className="inline-flex h-[22px] items-center rounded-sm bg-(--tag) px-2 text-[12px] leading-none font-semibold whitespace-nowrap text-[#141414]"
      style={{ '--tag': tagFill(name) } as CSSProperties}
    >
      {name}
    </span>
  );
}

interface TagsProps {
  /** The section the item belongs to. Shown first, on mixed feeds only. */
  section?: Section;
  names: (string | null | undefined)[];
  /** Plain grey text instead of filled tags: lists and showcases, not cards. */
  plain?: boolean;
  className?: string;
}

/**
 * The tags above a title. Cards on web get filled tags; phones, and anything
 * that is a list rather than a card, get the same names as plain text with
 * no section tag, because the page already says what it is.
 */
export function Tags({
  section,
  names,
  plain = false,
  className = '',
}: TagsProps) {
  const cats = cardTags(undefined, names);
  const all = cardTags(section, names);
  const text = (
    <span
      className={`text-fg-3 text-[13px] font-medium ${plain ? '' : 'md:hidden'}`}
    >
      {(plain ? all : cats).join(' · ')}
    </span>
  );
  if (plain) return <span className={className}>{text}</span>;
  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {text}
      <span className="hidden flex-wrap items-center gap-1.5 md:inline-flex">
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
export function listingTags(listing: Listing): string[] {
  return listing.kind === 'opportunity' && listing.sector
    ? [listing.category, listing.sector]
    : [listing.category];
}
