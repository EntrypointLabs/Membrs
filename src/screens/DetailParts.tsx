import type { ReactNode } from 'react';
import { titleCase } from '../lib/text';
import { Icon } from '../components/Icon';
import { Link } from '../components/Link';

/** Back button and breadcrumb trail above a detail page. */
export function Crumbs({ trail }: { trail: [string, string][] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-3 text-[15px]"
    >
      <button
        type="button"
        onClick={() => history.back()}
        aria-label="Back"
        className="bg-btn hover:bg-btn-hover grid h-9 w-9 place-items-center rounded-md"
      >
        <Icon name="chevronLeft" />
      </button>
      <ol className="text-fg-3 flex items-center gap-2">
        {trail.map(([label, href], i) => (
          <li key={href} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            <Link href={href} className="text-fg-2 hover:text-fg font-medium">
              {label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** One row of the details table: a label on the left, the fact, an action. */
export function Fact({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border-line grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 border-b py-5 md:grid-cols-[150px_1fr_auto] md:py-6">
      <dt className="text-fg-3 col-span-2 text-sm md:col-span-1 md:text-[15px]">
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
      {action ?? <span />}
    </div>
  );
}

export function FactAction({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand dark:text-accent flex items-center gap-1 text-[15px] font-semibold whitespace-nowrap"
    >
      {children} <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
    </a>
  );
}

/** A titled block in the main column. */
export function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-14">
      <h2 className="mb-5 text-2xl font-semibold tracking-tight md:text-3xl">
        {titleCase(title)}
      </h2>
      {children}
    </section>
  );
}

/**
 * The description, right under the photo on every detail page: a heading,
 * then one paragraph per string.
 */
export function AboutBlock({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <section className="mt-10 max-w-3xl md:mt-14">
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {titleCase(title)}
      </h2>
      {paragraphs.map((p) => (
        <p key={p} className="text-fg-2 mt-4 text-[17px] leading-relaxed">
          {p}
        </p>
      ))}
    </section>
  );
}

/** The sticky action card in the right column. */
export function ActionCard({ children }: { children: ReactNode }) {
  return (
    <aside className="bg-panel border-line-2 lg:top-bar self-start rounded-lg border p-6 lg:sticky">
      {children}
    </aside>
  );
}

export function SmallButton({
  onClick,
  href,
  children,
}: {
  onClick?: () => void;
  href?: string;
  children: string;
}) {
  const cls =
    'bg-btn hover:bg-btn-hover flex h-10 items-center justify-center rounded-md px-3 text-sm font-bold';
  if (href?.startsWith('/')) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** A map stand-in: where it is, and a button that opens a real map. */
export function MapCard({ name, area }: { name: string; area: string }) {
  const q = encodeURIComponent(`${name}, ${area}`);
  return (
    <div className="bg-soft border-line-2 relative mt-10 grid aspect-[16/9] place-items-center overflow-hidden rounded-lg border">
      <div className="text-center">
        <Icon name="pin" className="text-accent mx-auto h-8 w-8" />
        <p className="mt-2 font-semibold">{name}</p>
        <p className="text-fg-3 text-sm">{area}</p>
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-fg text-bg absolute right-4 bottom-4 flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-bold"
      >
        Open in Maps <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

/** Copy a link, or use the share sheet where the device has one. */
export async function share(title: string): Promise<'shared' | 'copied'> {
  const url = window.location.href;
  if (navigator.share) {
    await navigator.share({ title, url }).catch(() => undefined);
    return 'shared';
  }
  await navigator.clipboard?.writeText(url);
  return 'copied';
}
