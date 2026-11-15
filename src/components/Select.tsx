import {
  Select as Root,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Select as SelectPrimitive } from 'radix-ui';
import { Icon, type IconName } from './Icon';

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
  className = 'h-10',
}: SelectProps<T>) {
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <Root value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectPrimitive.Trigger
        aria-label={`${label}: ${current}`}
        className={`bg-btn hover:bg-btn-hover data-[state=open]:bg-btn-hover focus-visible:ring-accent flex ${className} shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3.5 text-[15px] whitespace-nowrap transition-colors outline-none focus-visible:ring-2`}
      >
        {icon ? (
          <Icon name={icon} className="text-accent" />
        ) : (
          <span className="text-fg-3">{label}</span>
        )}
        <span className="font-semibold">{current}</span>
        <Icon name="chevronDown" className="text-fg-3 h-3.5 w-3.5" />
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
            className="focus:bg-soft-hover data-[state=checked]:text-fg text-fg-2 [&_[data-slot=select-item-indicator]_svg]:text-accent h-10 cursor-pointer rounded-sm pr-9 pl-3 text-[15px] data-[state=checked]:font-semibold"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Root>
  );
}
