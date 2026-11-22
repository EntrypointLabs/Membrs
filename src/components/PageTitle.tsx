import { categoryStyle } from './CategoryLabel';
import { HeadingCount } from './HeadingCount';
import { Icon } from './Icon';
import { Link } from './Link';

interface PageTitleProps {
  /** The section the page belongs to: "Events", "Home". */
  section: string;
  /** Where the section name goes, when it is a link back. */
  sectionHref?: string;
  /** What is shown inside the section: "Tomorrow", "For You". */
  current: string;
  /** Grey when nothing is picked yet, as with "Events  Categories". */
  muted?: boolean;
  /** A picked category, shown in its own colour with a dot. */
  category?: string;
  count?: number;
  /** When set, the title opens the section's picker and shows a chevron. */
  onOpen?: () => void;
}

/**
 * The title every list page uses: "Section  Current". One component, so the
 * size, spacing and colours stay the same from page to page.
 */
export function PageTitle({
  section,
  sectionHref,
  current,
  muted = false,
  category,
  count,
  onOpen,
}: PageTitleProps) {
  const long = (section + current).length > 24;
  const size = long ? 'text-xl md:text-[34px]' : 'text-[25px] md:text-[40px]';
  const tone = category ? 'cat-color' : muted ? 'text-fg-3' : 'text-fg';
  const body = (
    <>
      {sectionHref ? (
        <Link href={sectionHref} className="hover:text-accent">
          {section}
        </Link>
      ) : (
        section
      )}{' '}
      <span
        className={`flex min-w-0 items-center gap-1.5 ${tone}`}
        style={category ? categoryStyle(category) : undefined}
      >
        {category && (
          <i className="cat-bg inline-block h-2 w-2 shrink-0 rounded-full" />
        )}
        <span className="truncate">{current}</span>
        {count !== undefined && <HeadingCount count={count} />}
        {onOpen && <Icon name="chevronRight" className="h-5 w-5 shrink-0" />}
      </span>
    </>
  );
  const shape = `flex max-w-full items-center gap-3 font-semibold tracking-tight whitespace-nowrap ${size}`;
  return (
    <h1 className="min-w-0 md:mb-10">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          className={shape}
        >
          {body}
        </button>
      ) : (
        <span className={shape}>{body}</span>
      )}
    </h1>
  );
}
