import {
  Select as Root,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Select as SelectPrimitive } from 'radix-ui';
import { createContext, useContext } from 'react';
import { Icon, type IconName } from './Icon';

export interface DrillMenu {
  label: string;
  value: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
}

/**
 * Set by a phone sheet that lists its filters as rows. A Select inside it
 * becomes a row that hands its menu to the sheet, which shows the options in
 * place, because a popover over a sheet is cramped on a small screen.
 */
export const SelectDrill = createContext<((menu: DrillMenu) => void) | null>(
  null,
);

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  /** Shown before the value in place of the label, as the city pin is. */
  icon?: IconName;
  className?: string;
}

/**
 * A filter chip: the label and the current value in one compact control. It
 * opens a menu in the membrs panel style rather than the system picker, and
 * Radix keeps it usable from the keyboard and by screen readers.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  icon,
  className = 'h-11',
}: SelectProps<T>) {
  const current = options.find((o) => o.value === value)?.label ?? value;
  const drill = useContext(SelectDrill);
  if (drill)
    return (
      <li>
        <button
          type="button"
          onClick={() =>
            drill({
              label,
              value,
              options,
              onChange: (v) => onChange(v as T),
            })
          }
          className="hover:bg-soft-hover flex w-full items-center justify-between gap-4 px-4 py-[15px] text-left text-[16.5px]"
        >
          {label}
          <span className="text-fg-3 flex min-w-0 items-center gap-1.5">
            <span className="truncate">{current}</span>
            <Icon name="chevronRight" className="h-4 w-4 shrink-0" />
          </span>
        </button>
      </li>
    );
  return (
    <Root value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectPrimitive.Trigger
        aria-label={`${label}: ${current}`}
        className={`bg-btn hover:bg-btn-hover data-[state=open]:bg-btn-hover focus-visible:ring-accent flex ${className} shrink-0 cursor-pointer items-center gap-2 rounded-md px-4 text-base whitespace-nowrap transition-colors outline-none focus-visible:ring-2`}
      >
        {icon ? (
          <Icon name={icon} className="text-accent" />
        ) : (
          <span className="text-fg-2">{label}</span>
        )}
        <span className="font-semibold">{current}</span>
        <Icon name="chevronDown" className="text-fg-2 h-4 w-4" />
      </SelectPrimitive.Trigger>
      <SelectContent
        position="popper"
        align="start"
        sideOffset={6}
        className="bg-panel border-line-2 text-fg z-[70] max-h-80 min-w-[var(--radix-select-trigger-width)] rounded-md p-0 shadow-[0_16px_48px_rgb(0_0_0/0.35)]"
      >
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            className="focus:bg-soft-hover data-[state=checked]:text-fg text-fg-2 [&_[data-slot=select-item-indicator]_svg]:text-accent h-11 cursor-pointer rounded-sm pr-9 pl-3 text-base data-[state=checked]:font-semibold"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Root>
  );
}
