import { useState, type ReactNode } from 'react';
import { setSearchParams } from '../lib/router';
import { slugify } from '../lib/text';
import { categoryStyle } from './CategoryLabel';
import { Icon } from './Icon';
import { Modal } from './Modal';

export interface PickerOption {
  value: string;
  label: string;
  count: number;
}

interface FeedPickerProps {
  /** The section: "Events", "Places". */
  title: string;
  /** The sheet title: "Event categories". */
  sheetTitle: string;
  /** What the type group is called: "Categories", "Types". */
  typeLabel: string;
  views: PickerOption[];
  types: PickerOption[];
  view: string | null;
  type: string | null;
  total: number;
}

/**
 * The section title doubles as its filter: "Events  Categories ›". Tapping it
 * lists every way to slice the section in one sheet: the time views (Tonight,
 * Closing Next Week, Open Now) and the categories. Both write to the URL, so
 * a "see more" link and a picked category land on the same page.
 */
export function FeedPicker({
  title,
  sheetTitle,
  typeLabel,
  views,
  types,
  view,
  type,
  total,
}: FeedPickerProps) {
  const [open, setOpen] = useState(false);
  const typeName = types.find((t) => t.value === type)?.label;
  const current = views.find((v) => v.value === view)?.label ?? typeName;
  const pick = (next: { view?: string | null; type?: string | null }) => {
    setSearchParams({
      view: next.view ?? null,
      type: next.type ?? null,
      page: null,
    });
    setOpen(false);
    window.scrollTo({ top: 0 });
  };
  const long = (title + (current ?? 'Categories')).length > 24;

  return (
    <>
      <h1 className="mb-6 min-w-0 md:mb-10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={`flex max-w-full items-baseline gap-3 font-semibold tracking-tight whitespace-nowrap ${
            long ? 'text-xl md:text-[34px]' : 'text-[25px] md:text-[40px]'
          }`}
        >
          {title}
          <span
            className={`flex min-w-0 items-center gap-1.5 ${type ? 'cat-color' : current ? 'text-fg' : 'text-fg-3'}`}
            style={typeName ? categoryStyle(typeName) : undefined}
          >
            {type && (
              <i className="cat-bg inline-block h-2 w-2 shrink-0 rounded-full" />
            )}
            <span className="truncate">{current ?? 'Categories'}</span>
            <Icon name="chevronRight" className="h-5 w-5 shrink-0" />
          </span>
        </button>
      </h1>
      {open && (
        <Modal title={sheetTitle} onClose={() => setOpen(false)}>
          <Group>
            <Option
              label={`All ${title.toLowerCase()}`}
              count={total}
              on={!view && !type}
              onClick={() => pick({})}
            />
          </Group>
          <Heading icon="clock">By date</Heading>
          <Group>
            {views.map((v) => (
              <Option
                key={v.value}
                label={v.label}
                count={v.count}
                on={view === v.value}
                onClick={() => pick({ view: v.value })}
              />
            ))}
          </Group>
          <Heading icon="tag">{`By ${typeLabel.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '')}`}</Heading>
          <Group>
            {types.map((t) => (
              <Option
                key={t.value}
                label={t.label}
                count={t.count}
                dot
                on={type === t.value}
                onClick={() => pick({ type: t.value })}
              />
            ))}
          </Group>
        </Modal>
      )}
    </>
  );
}

/** A quiet label above a group: an icon and sentence-case text, never shouting. */
function Heading({
  icon,
  children,
}: {
  icon: 'clock' | 'tag';
  children: string;
}) {
  return (
    <p className="text-fg-3 mx-1.5 mt-6 mb-2.5 flex items-center gap-2 text-sm font-semibold">
      <Icon name={icon} className="h-[15px] w-[15px] opacity-80" />
      {children}
    </p>
  );
}

/** Rows grouped in one rounded panel, separated by inset hairlines. */
function Group({ children }: { children: ReactNode }) {
  return (
    <ul className="bg-soft [&>li+li]:before:bg-line-2 overflow-hidden rounded-md [&>li+li]:relative [&>li+li]:before:absolute [&>li+li]:before:top-0 [&>li+li]:before:right-0 [&>li+li]:before:left-4 [&>li+li]:before:h-px [&>li+li]:before:content-['']">
      {children}
    </ul>
  );
}

function Option({
  label,
  count,
  on,
  dot,
  onClick,
}: {
  label: string;
  count: number;
  on: boolean;
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        className={`hover:bg-soft-hover flex w-full items-center justify-between px-4 py-[15px] text-left text-[16.5px] ${on ? 'text-accent' : ''}`}
      >
        <span className="flex items-center gap-2.5">
          {dot && (
            <i
              className="cat-bg inline-block h-1.5 w-1.5 rounded-full"
              style={categoryStyle(label)}
            />
          )}
          {label}
          <small
            className={`text-sm tabular-nums ${on ? 'text-accent/70' : 'text-fg-4'}`}
          >
            {count}
          </small>
        </span>
        {on && <Icon name="check" />}
      </button>
    </li>
  );
}

/** Count items per key, for the picker's numbers. */
export function countBy<T>(
  items: T[],
  key: (item: T) => string,
): PickerOption[] {
  const counts = new Map<string, number>();
  for (const item of items)
    counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return [...counts]
    .map(([label, count]) => ({ value: slugify(label), label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
