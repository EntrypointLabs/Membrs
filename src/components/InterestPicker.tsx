import { useEffect, useState, type ReactNode } from 'react';
import { track } from '../lib/analytics';
import { loadAccount, readerCountryStore, taxonomy } from '../lib/api';
import {
  africanCountry,
  matchingCountries,
  matchingStates,
  placeLabel,
  readerPlaceOf,
} from '../lib/africa';
import { CAPPED_KINDS, MAX_PICKS_PER_KIND } from '../lib/config';
import type { RemoteInterestPick } from '../lib/remote';
import { shown } from '../lib/sections';
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
import { Input } from './ui/input';

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
  disabled = false,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
  invalid?: boolean;
  mark?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 items-center gap-2 rounded-sm border px-3.5 text-[15px] font-medium transition-[color,background-color,border-color,scale] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
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
  const chips = (names: string[], kind: RemoteInterestPick['kind']) => {
    const capped = CAPPED_KINDS.includes(kind);
    const full =
      capped &&
      names.filter((n) => picked.includes(n)).length >= MAX_PICKS_PER_KIND;
    return (
      <>
        {capped && (
          <p className="text-fg-3 mb-3 text-sm">
            Pick up to {MAX_PICKS_PER_KIND}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {names.map((n) => (
            <Chip
              key={n}
              on={picked.includes(n)}
              disabled={full && !picked.includes(n)}
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
      </>
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <Accordion
        title="Location"
        summary={placeLabel(readerPlaceOf(city, readerCountryStore.get()))}
        open={open === 'city'}
        onToggle={() => openSection('city')}
      >
        <PlacePicker
          key={readerPlaceOf(city, readerCountryStore.get()).country}
          label={city}
          onPick={(label, done) => {
            track('preferences_city_picked', { city: label });
            onCity(label);
            if (done) onOpen('event');
          }}
        />
      </Accordion>
      <Accordion
        title="Events"
        summary={sum(offered.event)}
        open={open === 'event'}
        onToggle={() => openSection('event')}
      >
        {chips(offered.event, 'event')}
      </Accordion>
      <Accordion
        title="Opportunities"
        summary={sum(offered.opportunity)}
        open={open === 'opportunity'}
        onToggle={() => openSection('opportunity')}
      >
        {chips(offered.opportunity, 'opportunity')}
        {asksField(picked) && <FieldBlock />}
      </Accordion>
      {shown('places') && (
        <Accordion
          title="Places"
          summary={sum(offered.place)}
          open={open === 'place'}
          onToggle={() => openSection('place')}
        >
          {chips(offered.place, 'place')}
        </Accordion>
      )}
    </div>
  );
}

/** Lists longer than this get a search box, so a short list stays one tap away. */
const SEARCH_FROM = 12;

/**
 * Any African country, then any state or region in it. Picking a country
 * alone already counts, so a reader who does not want to name a state is
 * not forced to.
 */
function PlacePicker({
  label,
  onPick,
}: {
  label: string;
  onPick: (label: string, done: boolean) => void;
}) {
  const place = readerPlaceOf(label, readerCountryStore.get());
  const [code, setCode] = useState(place.country);
  const [query, setQuery] = useState('');
  const country = africanCountry(code);

  if (!country) {
    const countries = matchingCountries(query);
    return (
      <div className="flex flex-col gap-3">
        <Input
          type="search"
          aria-label="Search countries"
          placeholder="Search countries"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-line-2 h-11 text-[15px]"
        />
        <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto">
          {countries.map((c) => (
            <Chip
              key={c.code}
              mark={false}
              on={false}
              onClick={() => {
                setCode(c.code);
                setQuery('');
                onPick(
                  placeLabel({ country: c.code, state: '' }),
                  !c.states.length,
                );
              }}
            >
              {c.name}
            </Chip>
          ))}
          {!countries.length && (
            <p className="text-fg-3 text-[15px]">No country matches that.</p>
          )}
        </div>
      </div>
    );
  }

  const states = matchingStates(country, query);
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-3 text-[15px]">
        <b className="font-semibold">{country.name}</b>
        <button
          type="button"
          onClick={() => {
            setCode('');
            setQuery('');
          }}
          className="text-accent font-semibold"
        >
          Change country
        </button>
      </p>
      {country.states.length > SEARCH_FROM && (
        <Input
          type="search"
          aria-label={`Search ${country.name}`}
          placeholder="Search states and regions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-line-2 h-11 text-[15px]"
        />
      )}
      <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto">
        {states.map((s) => (
          <Chip
            key={s}
            on={place.country === country.code && place.state === s}
            onClick={() =>
              onPick(placeLabel({ country: country.code, state: s }), true)
            }
          >
            {s}
          </Chip>
        ))}
        {!states.length && (
          <p className="text-fg-3 text-[15px]">No state matches that.</p>
        )}
      </div>
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
