import type { FacetOption } from '../lib/filters';
import { Select } from './Select';

const NONE = 'all';

/**
 * One filter menu with a count beside every option, so a reader sees how
 * many listings a pick leaves before making it. With nothing to choose
 * between, it stays out of the way.
 */
export function FacetSelect({
  label,
  value,
  options,
  onChange,
  anyLabel = 'Any',
}: {
  label: string;
  value: string | null;
  options: FacetOption[];
  onChange: (value: string | null) => void;
  anyLabel?: string;
}) {
  if (options.length === 0 && !value) return null;
  return (
    <Select
      label={label}
      value={value ?? NONE}
      onChange={(v) => onChange(v === NONE ? null : v)}
      options={[
        { value: NONE, label: anyLabel },
        ...options.map((o) => ({
          value: o.value,
          label: `${o.label} · ${o.count}`,
        })),
      ]}
    />
  );
}
