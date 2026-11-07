import { taxonomy } from '../lib/api';
import { interestsStore, toggleInterest } from '../lib/preferences';
import { useStore } from '../lib/store';

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

export function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-10 rounded-sm px-4 text-[15px] font-medium transition-colors ${
        on ? 'bg-brand text-white' : 'bg-btn hover:bg-btn-hover text-fg-2'
      }`}
    >
      {children}
    </button>
  );
}

/** The eight cities people pick most, as one-tap chips. */
export function CityChips({
  value,
  onChange,
}: {
  value: string;
  onChange: (city: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {MAJOR_CITIES.map((c) => (
        <Chip key={c} on={value === c} onClick={() => onChange(c)}>
          {c}
        </Chip>
      ))}
    </div>
  );
}

/**
 * Interests grouped by Events, Opportunities and Places. The picks live in
 * interestsStore, so the footer, the digest modal and onboarding all agree.
 */
export function InterestPicker({ compact = false }: { compact?: boolean }) {
  const picked = useStore(interestsStore);
  const t = taxonomy();
  const groups: [string, string[]][] = [
    ['Events', t.eventCategories],
    ['Opportunities', t.opportunityCategories],
    ['Places', t.placeTypes],
  ];
  return (
    <div>
      <p className="mb-3 flex items-baseline justify-between text-sm font-bold">
        Your interests{' '}
        <span className="text-fg-3 font-medium">{picked.length} picked</span>
      </p>
      <div
        className={`flex flex-col gap-4 ${compact ? 'max-h-60 overflow-y-auto pr-1' : ''}`}
      >
        {groups.map(([label, names]) => (
          <div key={label}>
            <p className="text-fg-3 mb-2 text-xs font-semibold tracking-wider uppercase">
              {label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {names.map((n) => (
                <Chip
                  key={n}
                  on={picked.includes(n)}
                  onClick={() => toggleInterest(n)}
                >
                  {n}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
