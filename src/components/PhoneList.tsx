import { area, track } from '../lib/analytics';
import { titleCase } from '../lib/text';
import type { ListingSummary } from '../lib/types';
import { HeadingCount } from './HeadingCount';
import { Icon } from './Icon';
import { Link } from './Link';
import { ListingRow } from './ListingRow';

/** How many rows a phone home section shows. */
export const HOME_LIST = 5;

export function PhoneSectionHead({
  title,
  href,
  link,
  count,
  aside,
}: {
  title: string;
  href?: string;
  link?: string;
  count: number;
  /** Shown on the right of the heading, where a link would go, such as the reader's place. */
  aside?: string;
}) {
  return (
    <header className="mb-5 flex items-center justify-between gap-4 md:hidden">
      <h2 className="text-[26px] font-semibold tracking-tight">
        {titleCase(title)}
        <HeadingCount count={count} />
      </h2>
      {aside && <span className="text-fg-3 shrink-0 text-[15px]">{aside}</span>}
      {href && link && (
        <SeeAll href={href} className="-mr-2 shrink-0">
          {link}
        </SeeAll>
      )}
    </header>
  );
}

export function PhoneList({
  title,
  items,
  href,
  link,
  tour,
  aside,
  count,
  areaName = title.toLowerCase().replace(/\s+/g, '_'),
}: {
  title: string;
  items: ListingSummary[];
  count?: number;
  href?: string;
  link?: string;
  tour?: string;
  aside?: string;
  /** The analytics area, for lists whose title changes with the reader. */
  areaName?: string;
}) {
  if (!items.length) return null;
  return (
    <section data-tour={tour} className="mt-12 md:hidden" {...area(areaName)}>
      <PhoneSectionHead
        title={title}
        href={href}
        link={link}
        count={count ?? items.length}
        aside={aside}
      />
      <div>
        {items.slice(0, HOME_LIST).map((l) => (
          <ListingRow key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}

export function SeeAll({
  href,
  children,
  className = '',
}: {
  href: string;
  children: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={(e) =>
        track('see_all_clicked', { label: children, href }, e.currentTarget)
      }
      className={`text-fg-3 hover:text-fg flex h-10 items-center gap-1 px-2 text-[15px] font-semibold ${className}`}
    >
      {children} <Icon name="chevronRight" className="h-4 w-4" />
    </Link>
  );
}
