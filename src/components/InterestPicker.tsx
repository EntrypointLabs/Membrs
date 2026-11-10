import type { ReactNode } from 'react';
import { taxonomy } from '../lib/api';
import { FOLLOW_UPS } from '../lib/followups';
import {
  followUpsStore,
  interestsStore,
  toggleInterest,
} from '../lib/preferences';
import { useStore } from '../lib/store';
import { Icon } from './Icon';

const MAJOR_CITIES = [
  'Lagos',
  'Abuja',
  'Accra',
  'Nairobi',
  'Johannesburg',
  'Cairo',
  'Kigali',
  'Dakar',
];

/**
 * A pick: outlined with a plus when off, membrs blue with a tick when on, so
 * what is chosen reads at a glance.
 */
export function Chip({
  on,
  onClick,
  children,
  invalid = false,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
  invalid?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-10 items-center gap-2 rounded-sm border px-3.5 text-[15px] font-medium transition-colors ${
        on
          ? 'bg-brand border-brand text-white'
          : `hover:bg-soft text-fg ${invalid ? 'border-urgent/60' : 'border-line-2'}`
      }`}
    >
      {children}
      <Icon name={on ? 'check' : 'plus'} className="h-3.5 w-3.5 opacity-80" />
    </button>
  );
}

type Section = 'city' | 'event' | 'opportunity' | 'place';

/**
 * The picks step as accordions: City, Events, Opportunities, Places. One is
 * open at a time and each closed header sums up what is chosen. Opportunity
 * types that need it ask their follow-up right under the chips.
 */
export function PreferenceAccordions({
  city,
  onCity,
  missing,
  open,
  onOpen,
}: {
  city: string;
  onCity: (city: string) => void;
  /** Interests whose required follow-up is unanswered after a save attempt. */
  missing: string[];
  open: Section;
  onOpen: (section: Section) => void;
}) {
  const picked = useStore(interestsStore);
  const answers = useStore(followUpsStore);
  const t = taxonomy();
  const sum = (names: string[]) => {
    const on = names.filter((n) => picked.includes(n));
    return on.length ? on.join(', ') : '';
  };
  const chips = (names: string[]) => (
    <div className="flex flex-wrap gap-2">
      {names.map((n) => (
        <Chip
          key={n}
          on={picked.includes(n)}
          onClick={() => {
            toggleInterest(n);
            if (picked.includes(n) && answers[n])
              followUpsStore.set((prev) => {
                const next = { ...prev };
                delete next[n];
                return next;
              });
          }}
        >
          {n}
        </Chip>
      ))}
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <Accordion
        title="City"
        summary={city}
        open={open === 'city'}
        onToggle={() => onOpen('city')}
      >
        <div className="flex flex-wrap gap-2">
          {MAJOR_CITIES.map((c) => (
            <Chip
              key={c}
              on={city === c}
              onClick={() => {
                onCity(c);
                onOpen('event');
              }}
            >
              {c}
            </Chip>
          ))}
        </div>
      </Accordion>
      <Accordion
        title="Events"
        summary={sum(t.eventCategories)}
        open={open === 'event'}
        onToggle={() => onOpen('event')}
      >
        {chips(t.eventCategories)}
      </Accordion>
      <Accordion
        title="Opportunities"
        summary={sum(t.opportunityCategories)}
        open={open === 'opportunity'}
        onToggle={() => onOpen('opportunity')}
      >
        {chips(t.opportunityCategories)}
        {t.opportunityCategories
          .filter((n) => FOLLOW_UPS[n] && picked.includes(n))
          .map((n) => (
            <FollowUpBlock key={n} name={n} invalid={missing.includes(n)} />
          ))}
      </Accordion>
      <Accordion
        title="Places"
        summary={sum(t.placeTypes)}
        open={open === 'place'}
        onToggle={() => onOpen('place')}
      >
        {chips(t.placeTypes)}
      </Accordion>
    </div>
  );
}

function FollowUpBlock({ name, invalid }: { name: string; invalid: boolean }) {
  const answers = useStore(followUpsStore);
  const { question, options } = FOLLOW_UPS[name]!;
  const chosen = answers[name] ?? [];
  const bad = invalid && chosen.length === 0;
  return (
    <div className="border-line-2 mt-4 border-t pt-4" data-followup={name}>
      <p className="mb-2.5 flex flex-wrap items-baseline gap-1.5 text-sm">
        <b className="font-semibold">{name}</b>
        <span className="text-fg-3">{question}</span>
        <em
          className={`ml-auto text-xs not-italic ${bad ? 'text-urgent font-semibold' : 'text-fg-4'}`}
        >
          {bad ? 'Pick at least one' : 'Required'}
        </em>
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip
            key={o}
            invalid={bad}
            on={chosen.includes(o)}
            onClick={() =>
              followUpsStore.set((prev) => {
                const cur = prev[name] ?? [];
                return {
                  ...prev,
                  [name]: cur.includes(o)
                    ? cur.filter((x) => x !== o)
                    : [...cur, o],
                };
              })
            }
          >
            {o}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Accordion({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-md border ${open ? 'border-fg-4' : 'border-line-2'}`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
      >
        <span className="text-[17px] font-semibold">{title}</span>
        <span className="text-fg-3 flex min-w-0 items-center gap-2 text-[15px]">
          <span className={`truncate ${summary ? '' : 'text-fg-4'}`}>
            {summary || 'Choose'}
          </span>
          <Icon
            name="chevronDown"
            className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}
