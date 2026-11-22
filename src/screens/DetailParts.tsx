import {
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ToolLogo } from '../components/ToolLogo';
import { DropdownMenu } from 'radix-ui';
import {
  area,
  context,
  contextOf,
  track,
  type ItemRef,
} from '../lib/analytics';
import {
  listingQuestion,
  openOutside,
  OUTSIDE_TOOLS,
  takesPromptInLink,
} from '../lib/askTools';
import { navigate } from '../lib/router';
import { titleCase } from '../lib/text';
import { cameFromApp, copyText, toast } from '../lib/ui';
import { Icon, type IconName } from '../components/Icon';
import { Link } from '../components/Link';
import { Photo } from '../components/Photo';

function goBack(trail: [string, string][], from: Element) {
  track('back_clicked', {}, from);
  if (cameFromApp() || !trail[0]) window.history.back();
  else navigate(trail[0][1]);
}

export function Crumbs({ trail }: { trail: [string, string][] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-3 text-[15px]"
      {...area('breadcrumbs')}
    >
      <button
        type="button"
        onClick={(e) => goBack(trail, e.currentTarget)}
        aria-label="Back"
        className="bg-btn hover:bg-btn-hover grid h-9 w-9 place-items-center rounded-md"
      >
        <Icon name="chevronLeft" />
      </button>
      <ol className="text-fg-3 flex items-center gap-2">
        {trail.map(([label, href], i) => (
          <li key={href} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            <Link
              href={href}
              onClick={(e) =>
                track(
                  'breadcrumb_clicked',
                  { label, href, depth: i + 1 },
                  e.currentTarget,
                )
              }
              className="text-fg-2 hover:text-fg font-bold"
            >
              {label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const OVERLAY_BUTTON =
  'grid h-11 w-11 place-items-center rounded-xl bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/60';

export function OverlayButton({
  icon,
  label,
  action,
  onClick,
  href,
}: {
  icon: IconName;
  label: string;
  /** What the button does, for analytics: "share", "remind_me". */
  action?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  href?: string;
}) {
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={label}
      {...context({ action })}
      className={OVERLAY_BUTTON}
    >
      <Icon name={icon} />
    </a>
  ) : (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      {...context({ action })}
      className={OVERLAY_BUTTON}
    >
      <Icon name={icon} />
    </button>
  );
}

export function OverlayMenu({
  icon,
  label,
  action,
  items,
}: {
  icon: IconName;
  label: string;
  /** What opening the menu is for, for analytics: "calendar_menu". */
  action: string;
  items: {
    label: string;
    action: string;
    href?: string;
    onSelect?: (from: HTMLElement) => void;
  }[];
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  // The menu renders in a portal outside the page, so clicks in it would lose
  // the area and item the trigger sits in. It takes them along when it opens.
  const [scope, setScope] = useState<ReturnType<typeof contextOf>>({});
  return (
    <DropdownMenu.Root
      modal={false}
      onOpenChange={(open) =>
        open && setScope(contextOf(trigger.current?.parentElement))
      }
    >
      <DropdownMenu.Trigger
        ref={trigger}
        aria-label={label}
        {...context({ action })}
        className={OVERLAY_BUTTON}
      >
        <Icon name={icon} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          {...context(scope)}
          align="end"
          sideOffset={8}
          className="bg-panel border-line-2 text-fg z-[70] min-w-48 rounded-md border p-1 shadow-[0_16px_48px_rgb(0_0_0/0.35)]"
        >
          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              asChild={Boolean(item.href)}
              // Radix dispatches the select event on the item element itself.
              onSelect={(e) => item.onSelect?.(e.currentTarget as HTMLElement)}
              {...context({ action: item.action })}
              className="data-[highlighted]:bg-soft-hover flex h-11 cursor-pointer items-center rounded-sm px-3 text-[15px] font-medium outline-none"
            >
              {item.href ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  {item.label}
                </a>
              ) : (
                item.label
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function DetailHead({
  trail,
  title,
  photo,
  tools,
}: {
  trail: [string, string][];
  title: string;
  photo: {
    id: string;
    src?: string;
    cover?: { title: string; tag: string };
  };
  tools?: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <div className="hidden md:block">
        <Crumbs trail={trail} />
      </div>
      <header className="mt-7 md:mt-8">
        <h1 className="text-[clamp(30px,4vw,68px)] leading-[1.08] font-semibold tracking-tight text-pretty md:leading-[1.04]">
          {title}
        </h1>
      </header>
      <div className="relative -mx-4 max-md:order-first md:mx-0 md:mt-10">
        <Photo
          size="wide"
          id={photo.id}
          src={photo.src}
          cover={photo.cover}
          alt={title}
          priority
          className="md:rounded-photo aspect-[4/3] md:aspect-[2/1]"
        />
        <div
          className="absolute inset-x-4 top-[calc(12px+env(safe-area-inset-top,0px))] flex items-center justify-between md:hidden"
          {...area('photo_tools')}
        >
          <OverlayButton
            icon="chevronLeft"
            label="Back"
            onClick={(e) => goBack(trail, e.currentTarget)}
          />
          <div className="flex items-center gap-2">{tools}</div>
        </div>
      </div>
    </div>
  );
}

const FACT_ICONS: Record<string, IconName> = {
  Date: 'cal',
  Venue: 'pin',
  Where: 'pin',
  Format: 'org',
  'Offered by': 'org',
  Price: 'tag',
  Entry: 'tag',
  Offer: 'tag',
  Deadline: 'clock',
  Ends: 'clock',
  Today: 'clock',
  Award: 'award',
  Level: 'spark',
  'Who can apply': 'check',
};

/**
 * One row of the details list: a tinted icon tile, the fact in bold with a
 * quieter line under it, and an optional action on the right. The label is
 * kept for screen readers; the icon says it for everyone else.
 */
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
    <div className="group flex items-center gap-4">
      <span
        aria-hidden="true"
        className="bg-accent/12 text-accent grid h-11 w-11 shrink-0 place-items-center rounded-xl"
      >
        <Icon name={FACT_ICONS[label] ?? 'tag'} className="h-5 w-5" />
      </span>
      <div className="border-line @container flex min-w-0 flex-1 items-center gap-4 border-b py-4 group-last:border-b-0">
        <dt className="sr-only">{label}</dt>
        <dd className="min-w-0 flex-1 [&>p:first-child]:text-[17px]">
          {children}
        </dd>
        {action}
      </div>
    </div>
  );
}

export function FactAction({
  href,
  icon,
  action,
  onClick,
  children,
}: {
  href: string;
  icon: IconName;
  /** What the link does, for analytics: "directions", "remind_me". */
  action: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  children: string;
}) {
  return (
    <a
      href={href}
      {...context({ action })}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      aria-label={children}
      title={children}
      className="bg-btn hover:bg-btn-hover flex h-10 shrink-0 items-center justify-center rounded-md px-4 text-[15px] font-semibold whitespace-nowrap transition-colors @max-[19rem]:w-10 @max-[19rem]:px-0"
    >
      <span className="@max-[19rem]:hidden">{children}</span>
      <Icon name={icon} className="hidden h-5 w-5 @max-[19rem]:block" />
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
  className = 'mt-10 md:mt-14',
}: {
  title: string;
  paragraphs: string[];
  className?: string;
}) {
  return (
    <section className={`max-w-3xl ${className}`}>
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

export function DetailBody({
  about,
  action,
  primary,
  links,
  tail,
  map,
  children,
}: {
  about: ReactNode;
  action: ReactNode;
  primary: ReactNode;
  links: ReactNode;
  tail?: ReactNode;
  map?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 grid gap-8 md:mt-14 md:gap-12 lg:grid-cols-[minmax(0,1fr)_clamp(360px,24vw,460px)] lg:gap-x-16">
      {about}
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="hidden h-full md:block">{action}</div>
        <div
          className="flex flex-col gap-3 md:hidden"
          {...area('mobile_actions')}
        >
          {primary}
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        {children}
        {/* On phones the map closes the page, after the links and tags; on wider screens it stays under the facts. */}
        {map && <div className="order-last md:order-none">{map}</div>}
        <ul className="mt-6 md:hidden" {...area('mobile_links')}>
          {links}
        </ul>
        {tail}
      </div>
    </div>
  );
}

export function PrimaryLink({
  href,
  item,
  cta,
  children,
}: {
  href: string;
  item: ItemRef;
  /** The call to action, for analytics: "get_ticket", "go_to_merchant". */
  cta: string;
  children: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) =>
        track('listing_cta_clicked', { ...item, cta }, e.currentTarget)
      }
      {...context({ action: cta })}
      className="bg-brand hover:bg-brand-hover flex h-12 items-center justify-center gap-1.5 rounded-md font-bold text-white"
    >
      {children} <Icon name="arrowUpRight" className="h-3.5 w-3.5" />
    </a>
  );
}

export function LinkRow({
  icon,
  label,
  action,
  href,
  onClick,
  wrap,
}: {
  icon: IconName;
  label: string;
  /** What the row does, for analytics: "find_similar", "share". */
  action: string;
  href?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  wrap?: (control: ReactElement) => ReactNode;
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="bg-accent/12 text-accent grid h-11 w-11 shrink-0 place-items-center rounded-xl"
      >
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="border-line flex min-w-0 flex-1 items-center justify-between gap-4 border-b py-5 text-[17px] font-semibold group-last:border-b-0">
        {label}
        <Icon name="chevronRight" className="text-fg-3 h-4 w-4" />
      </span>
    </>
  );
  const cls = 'flex w-full items-center gap-4 text-left';
  return (
    <li className="group" {...context({ action })}>
      {href ? (
        <Link href={href} onClick={onClick} className={cls}>
          {body}
        </Link>
      ) : (
        (wrap ?? ((control: ReactElement) => control))(
          <button type="button" onClick={onClick} className={cls}>
            {body}
          </button>,
        )
      )}
    </li>
  );
}

export async function shareAndConfirm(
  title: string,
  item: ItemRef,
  from: Element,
): Promise<void> {
  const outcome = await share(title);
  if (outcome !== 'failed')
    track(
      'item_shared',
      { ...item, method: outcome === 'copied' ? 'copied' : 'share_sheet' },
      from,
    );
  if (outcome === 'copied') toast('Link copied');
  if (outcome === 'failed') toast('Could not share this link');
}

/** The sticky action card in the right column. */
export function ActionCard({ children }: { children: ReactNode }) {
  return (
    <aside
      className="bg-panel border-line-2 lg:top-bar rounded-lg border p-6 lg:sticky"
      {...area('action_card')}
    >
      {children}
    </aside>
  );
}

export const SMALL_BUTTON =
  'bg-btn hover:bg-btn-hover flex h-10 items-center justify-center rounded-md px-3 text-sm font-bold';

export function AssistantLogos() {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {OUTSIDE_TOOLS.map((tool) => (
        <ToolLogo key={tool.id} src={tool.logo} />
      ))}
    </span>
  );
}

export function AskAIMenu({
  kind,
  title,
  children,
}: {
  kind: 'event' | 'opportunity';
  title: string;
  children: ReactElement;
}) {
  const ask = (tool: (typeof OUTSIDE_TOOLS)[number]) => {
    openOutside(tool.id, listingQuestion(kind, title));
    if (!takesPromptInLink(tool.id))
      toast(`Question copied. Paste it into ${tool.name}.`);
  };
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="bg-panel border-line-2 text-fg z-[70] min-w-52 rounded-md border p-1 shadow-[0_16px_48px_rgb(0_0_0/0.35)]"
        >
          {OUTSIDE_TOOLS.map((tool) => (
            <DropdownMenu.Item
              key={tool.id}
              onSelect={() => ask(tool)}
              className="data-[highlighted]:bg-soft-hover flex h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-[15px] font-medium outline-none"
            >
              <ToolLogo src={tool.logo} size="large" />
              {tool.name}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function SmallButton({
  onClick,
  href,
  action,
  children,
}: {
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  href?: string;
  /** What the button does, for analytics: "share", "add_to_calendar_ics". */
  action: string;
  children: string;
}) {
  const cls = SMALL_BUTTON;
  if (href?.startsWith('/')) {
    return (
      <Link
        href={href}
        onClick={onClick}
        {...context({ action })}
        className={cls}
      >
        {children}
      </Link>
    );
  }
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      {...context({ action })}
      className={cls}
    >
      {children}
    </a>
  ) : (
    <button
      type="button"
      onClick={onClick}
      {...context({ action })}
      className={cls}
    >
      {children}
    </button>
  );
}

/** A map stand-in: where it is, and a button that opens a real map. */
export function MapCard({ name, area }: { name: string; area: string }) {
  const q = encodeURIComponent(`${name}, ${area}`);
  return (
    <div
      {...context({ area: 'map' })}
      className="bg-soft border-line-2 rounded-photo relative mt-10 aspect-[16/9] overflow-hidden border"
    >
      <iframe
        title={`Map of ${name}`}
        src={`https://maps.google.com/maps?q=${q}&z=16&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 h-full w-full border-0 dark:[filter:invert(90%)_hue-rotate(180deg)]"
      />
    </div>
  );
}

export async function share(
  title: string,
): Promise<'shared' | 'copied' | 'failed'> {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (error) {
      // Closing the sheet is a choice, not a failure; anything else (a blocked or unsupported share) still leaves the reader with the link.
      if (error instanceof DOMException && error.name === 'AbortError')
        return 'shared';
    }
  }
  return (await copyText(url)) ? 'copied' : 'failed';
}
