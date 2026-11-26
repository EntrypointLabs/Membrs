import {
  Select as Root,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useRef } from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { createContext, useContext } from 'react';
import { track } from '../lib/analytics';
import { cn } from '../lib/utils';
import { Icon, type IconName } from './Icon';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  disabled?: boolean;
}

export function optionText(option: SelectOption): string {
  return option.count === undefined
    ? option.label
    : `${option.label} · ${option.count}`;
}

function textOf(option: SelectOption | undefined): string | undefined {
  return option && optionText(option);
}

export interface DrillMenu {
  label: string;
  value: string;
  options: readonly SelectOption[];
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
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** Shown before the value in place of the label, as the city pin is. */
  icon?: IconName;
  className?: string;
  unset?: T;
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
  className,
  unset,
}: SelectProps<T>) {
  const trigger = useRef<HTMLButtonElement>(null);
  const current = textOf(options.find((o) => o.value === value)) ?? value;
  const pick = (next: T) => {
    // The menu renders in a portal, outside the page's areas, so the event
    // takes its area from the trigger instead.
    track(
      'filter_changed',
      {
        filter: label,
        value: next,
        label: textOf(options.find((o) => o.value === next)) ?? next,
      },
      trigger.current,
    );
    onChange(next);
  };
  const chip = unset !== undefined;
  const picked = chip && value !== unset;
  const drill = useContext(SelectDrill);
  if (drill)
    return (
      <li>
        <button
          ref={trigger}
          type="button"
          onClick={() =>
            drill({
              label,
              value,
              options,
              onChange: (v) => pick(v as T),
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
    <Root value={value} onValueChange={(v) => pick(v as T)}>
      <SelectPrimitive.Trigger
        ref={trigger}
        aria-label={`${label}: ${current}`}
        className={cn(
          'bg-btn hover:bg-btn-hover data-[state=open]:bg-btn-hover focus-visible:ring-accent flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-md px-4 text-base whitespace-nowrap transition-colors outline-none focus-visible:ring-2',
          chip &&
            'h-10 gap-1.5 px-3.5 text-[15px] font-semibold md:h-11 md:px-4 md:text-base',
          picked && 'bg-fg text-bg hover:bg-fg/90 data-[state=open]:bg-fg/90',
          className,
        )}
      >
        {chip ? (
          <span>
            {picked
              ? (options.find((o) => o.value === value)?.label ?? value)
              : label}
          </span>
        ) : (
          <>
            {icon ? (
              <Icon name={icon} className="text-accent" />
            ) : (
              <span className="text-fg-2">{label}</span>
            )}
            <span className="font-semibold">{current}</span>
          </>
        )}
        <Icon
          name="chevronDown"
          className={cn('h-4 w-4', picked ? 'text-bg/70' : 'text-fg-2')}
        />
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
            {optionText(o)}
          </SelectItem>
        ))}
      </SelectContent>
    </Root>
  );
}
