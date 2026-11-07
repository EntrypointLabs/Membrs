import { useId } from 'react';
import { Icon } from './Icon';

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/**
 * A filter chip: the label and the current value in one compact control,
 * backed by a native select so it works with a keyboard and on every phone.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectProps<T>) {
  const id = useId();
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <label
      htmlFor={id}
      className="bg-btn hover:bg-btn-hover relative flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3.5 text-[15px] whitespace-nowrap transition-colors"
    >
      <span className="text-fg-3">{label}</span>
      <span className="font-semibold">{current}</span>
      <Icon name="chevronDown" className="text-fg-3 h-3.5 w-3.5" />
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
