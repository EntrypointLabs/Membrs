import { useEffect, type ReactNode } from 'react';
import { track } from '../lib/analytics';
import { loadAccount, taxonomy } from '../lib/api';
import { shown } from '../lib/sections';
import { digestCities } from '../lib/digest';
import { asksField, FIELD_QUESTION, FIELDS } from '../lib/followups';
import {
  cityStore,
  fieldsStore,
  interestsStore,
  toggleInterest,
} from '../lib/preferences';
import { useStore } from '../lib/store';
import { titleCase } from '../lib/text';
import { Icon } from './Icon';

/**
 * A pick: outlined with a plus when off, membrs blue with a tick when on, so
 * what is chosen reads at a glance.
 */
export function Chip({
  on,
  onClick,
  children,
  invalid = false,
  mark = true,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
  invalid?: boolean;
  mark?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-10 items-center gap-2 rounded-sm border px-3.5 text-[15px] font-medium transition-[color,background-color,border-color,scale] duration-150 ease-out active:scale-[0.97] ${
        on
          ? 'bg-brand border-brand text-white'
          : `hover:bg-soft text-fg ${invalid ? 'border-urgent/60' : 'border-line-2'}`
      }`}
    >
      {children}
      {mark && (
        <Icon name={on ? 'check' : 'plus'} className="h-3.5 w-3.5 opacity-80" />
      )}
    </button>
  );
}

type Section = 'city' | 'event' | 'opportunity' | 'place';

export function PreferenceAccordions({
  city,
  onCity,
  open,
  onOpen,
}: {
  city: string;
  onCity: (city: string) => void;
  open: Section;
  onOpen: (section: Section) => void;
}) {
  const picked = useStore(interestsStore);
  const offered = taxonomy().onboardingInterests;
  useEffect(() => {
    let mounted = true;
    void loadAccount().then(() => {
      if (mounted) onCity(cityStore.get());
    });
    return () => {
      mounted = false;
    };
  }, [onCity]);
  const openSection = (section: Section) => {
    if (section !== open) track('preferences_section_opened', { section });
    onOpen(section);
  };
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
            track('interest_toggled', {
              interest: n,
              selected: !picked.includes(n),
            });
            toggleInterest(n);
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
        onToggle={() => openSection('city')}
      >
        <div className="flex flex-wrap gap-2">
          {digestCities(city).map((c) => (
            <Chip
              key={c}
              on={city === c}
              onClick={() => {
                track('preferences_city_picked', { city: c });
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
        summary={sum(offered.event)}
        open={open === 'event'}
        onToggle={() => openSection('event')}
      >
        {chips(offered.event)}
      </Accordion>
      <Accordion
        title="Opportunities"
        summary={sum(offered.opportunity)}
        open={open === 'opportunity'}
        onToggle={() => openSection('opportunity')}
      >
        {chips(offered.opportunity)}
        {asksField(picked) && <FieldBlock />}
      </Accordion>
      {shown('places') && (
        <Accordion
          title="Places"
          summary={sum(offered.place)}
          open={open === 'place'}
          onToggle={() => openSection('place')}
        >
          {chips(offered.place)}
        </Accordion>
      )}
    </div>
  );
}

function FieldBlock() {
  const chosen = useStore(fieldsStore);
  return (
    <div className="border-line-2 mt-4 border-t pt-4" data-followup="field">
      <p className="mb-2.5 flex flex-wrap items-baseline gap-1.5 text-sm">
        <b className="font-semibold">{titleCase('Your field')}</b>
        <span className="text-fg-3">{FIELD_QUESTION}</span>
        <em className="text-fg-4 ml-auto text-xs not-italic">Optional</em>
      </p>
      <div className="flex flex-wrap gap-2">
        {FIELDS.map((o) => (
          <Chip
            key={o}
            on={chosen.includes(o)}
            onClick={() => {
              track('follow_up_answered', {
                interest: 'field',
                answer: o,
                selected: !chosen.includes(o),
              });
              fieldsStore.set((prev) =>
                prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o],
              );
            }}
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
