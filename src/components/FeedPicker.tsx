import { useState, type ReactNode } from 'react';
import { area, track } from '../lib/analytics';
import { useIsPhone } from '../lib/media';
import { searchHref, useLocation } from '../lib/router';
import { slugify } from '../lib/text';
import { Icon } from './Icon';
import { Link } from './Link';
import { categoryStyle } from './CategoryLabel';
import { Modal } from './Modal';
import { PageTitle } from './PageTitle';
import { Presence } from './Presence';
import { SelectDrill, type DrillMenu } from './Select';

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
  filters?: ReactNode;
  /** What the title shows with nothing picked: "Categories", "For You". */
  placeholder?: string;
  /** The first option in the sheet, "All events" by default. */
  allLabel?: string;
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
  filters,
  placeholder = 'Categories',
  allLabel,
}: FeedPickerProps) {
  const [open, setOpen] = useState(false);
  const [drill, setDrill] = useState<DrillMenu | null>(null);
  const phone = useIsPhone();
  const typeName = types.find((t) => t.value === type)?.label;
  const current = views.find((v) => v.value === view)?.label ?? typeName;
  const location = useLocation();
  const pick = (next: { view?: string | null; type?: string | null }) =>
    searchHref(location, {
      view: next.view ?? null,
      type: next.type ?? null,
      page: null,
    });
  const close = () => {
    setOpen(false);
    setDrill(null);
  };
  const choose =
    (next: { view?: string | null; type?: string | null }) => () => {
      track('picker_option_selected', {
        section: title,
        view: next.view ?? null,
        type: next.type ?? null,
      });
      close();
    };

  return (
    <>
      <PageTitle
        section={title}
        current={current ?? placeholder}
        muted={!current && !allLabel}
        category={type ? typeName : undefined}
        onOpen={() => {
          track('picker_opened', { section: title });
          setOpen(true);
        }}
      />
      <Presence value={open}>
        {() => (
          <Modal title={drill?.label ?? sheetTitle} onClose={close}>
            <div {...area('picker')}>
              {drill ? (
                <DrillOptions menu={drill} onDone={() => setDrill(null)} />
              ) : (
                <>
                  {filters &&
                    (phone ? (
                      <SelectDrill.Provider value={setDrill}>
                        <div className="mb-5">
                          <Group>{filters}</Group>
                        </div>
                      </SelectDrill.Provider>
                    ) : (
                      <div className="mb-5 flex flex-wrap gap-2">{filters}</div>
                    ))}
                  <Group>
                    <Option
                      label={allLabel ?? `All ${title.toLowerCase()}`}
                      count={total}
                      on={!view && !type}
                      href={pick({})}
                      onClick={choose({})}
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
                        href={pick({ view: v.value })}
                        onClick={choose({ view: v.value })}
                      />
                    ))}
                  </Group>
                  {types.length > 0 && (
                    <>
                      <Heading icon="tag">{`By ${typeLabel.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '')}`}</Heading>
                      <Group>
                        {types.map((t) => (
                          <Option
                            key={t.value}
                            label={t.label}
                            count={t.count}
                            dot
                            on={type === t.value}
                            href={pick({ type: t.value })}
                            onClick={choose({ type: t.value })}
                          />
                        ))}
                      </Group>
                    </>
                  )}
                </>
              )}
            </div>
          </Modal>
        )}
      </Presence>
    </>
  );
}

/** One filter's options, in place of the sheet, with a way back to every filter. */
function DrillOptions({
  menu,
  onDone,
}: {
  menu: DrillMenu;
  onDone: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onDone}
        className="text-accent mb-4 flex items-center gap-1 text-[15px] font-semibold"
      >
        <Icon name="chevronLeft" className="h-4 w-4" />
        All filters
      </button>
      <Group>
        {menu.options.map((o) => {
          const on = o.value === menu.value;
          return (
            <li key={o.value}>
              <button
                type="button"
                disabled={o.disabled}
                aria-pressed={on}
                onClick={() => {
                  menu.onChange(o.value);
                  onDone();
                }}
                className={`hover:bg-soft-hover flex w-full items-center justify-between px-4 py-[15px] text-left text-[16.5px] disabled:opacity-40 ${on ? 'text-accent' : ''}`}
              >
                {o.label}
                {on && <Icon name="check" />}
              </button>
            </li>
          );
        })}
      </Group>
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
  href,
  onClick,
}: {
  label: string;
  count: number;
  on: boolean;
  dot?: boolean;
  href: string;
  onClick: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        aria-current={on ? 'page' : undefined}
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
      </Link>
    </li>
  );
}

/** The time views that have anything in them, with their counts. */
export function viewOptions<T>(
  views: readonly { id: string; label: string; test: (item: T) => boolean }[],
  items: T[],
): PickerOption[] {
  return views
    .map((v) => ({
      value: v.id,
      label: v.label,
      count: items.filter(v.test).length,
    }))
    .filter((v) => v.count);
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
