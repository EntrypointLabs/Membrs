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
  chip = false,
}: {
  label: string;
  value: string | null;
  options: FacetOption[];
  onChange: (value: string | null) => void;
  anyLabel?: string;
  chip?: boolean;
}) {
  if (options.length === 0 && !value) return null;
  return (
    <Select
      label={label}
      value={value ?? NONE}
      onChange={(v) => onChange(v === NONE ? null : v)}
      unset={chip ? NONE : undefined}
      options={[{ value: NONE, label: anyLabel }, ...options]}
    />
  );
}
