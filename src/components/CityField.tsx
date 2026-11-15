import { useEffect, useId, useRef, useState } from 'react';
import { suggestCities } from '../lib/api';
import { newIdempotencyKey } from '../lib/http';
import { Icon } from './Icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const WORLDWIDE = 'Worldwide';

const TYPING_PAUSE_MS = 250;

interface Option {
  key: string;
  label: string;
  detail: string;
  value: string;
}

const WORLDWIDE_OPTION: Option = {
  key: 'worldwide',
  label: WORLDWIDE,
  detail: 'Online, or open to anyone anywhere',
  value: WORLDWIDE,
};

export function CityField({
  id,
  value,
  placeholder,
  invalid,
  className,
  onChange,
}: {
  id: string;
  value: string;
  placeholder?: string;
  invalid: boolean;
  className?: string;
  onChange: (value: string, picked: boolean) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<Option[]>([]);
  const session = useRef('');

  useEffect(() => {
    if (!open) return;
    const query = value.trim();
    if (query.length < 2) {
      setFound([]);
      return;
    }
    let current = true;
    const timer = window.setTimeout(() => {
      suggestCities(query, session.current)
        .then((cities) => {
          if (current)
            setFound(
              cities.map((c) => ({
                key: c.placeId,
                label: c.city,
                detail: c.region,
                value: c.city,
              })),
            );
        })
        .catch(() => {
          if (current) setFound([]);
        });
    }, TYPING_PAUSE_MS);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [open, value]);

  const typed = value.trim().toLowerCase();
  const offerWorldwide =
    !typed || WORLDWIDE.toLowerCase().startsWith(typed) || typed === 'online';
  const options = offerWorldwide ? [WORLDWIDE_OPTION, ...found] : found;
  const showList = open && options.length > 0;

  function pick(option: Option) {
    onChange(option.value, true);
    setOpen(false);
    session.current = '';
  }

  return (
    <div className="relative">
      <Icon
        name="pin"
        className="text-fg-3 pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
      />
      <Input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onFocus={() => {
          session.current ||= newIdempotencyKey();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          onChange(e.target.value, false);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % options.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i - 1 + options.length) % options.length);
          } else if (e.key === 'Enter') {
            const chosen = options[active];
            if (chosen) {
              e.preventDefault();
              pick(chosen);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={cn(className, 'pl-10')}
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="bg-bg border-line-2 absolute inset-x-0 top-full z-20 mt-1.5 max-h-80 overflow-auto rounded-md border p-1 shadow-lg"
        >
          {options.map((option, i) => (
            <li
              key={option.key}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5',
                i === active && 'bg-soft-hover',
              )}
            >
              <Icon
                name={option.key === WORLDWIDE_OPTION.key ? 'nav' : 'pin'}
                className="text-fg-3 size-4 shrink-0"
              />
              <span className="min-w-0">
                <span className="block truncate text-[15px]">
                  {option.label}
                </span>
                {option.detail && (
                  <span className="text-fg-3 block truncate text-[13px]">
                    {option.detail}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
