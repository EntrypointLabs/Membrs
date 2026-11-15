import { track } from '../lib/analytics';

interface TabsProps<T extends string> {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}

/** The segmented control used for feed filters and the legal documents. */
export function Tabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="bg-soft no-scrollbar flex w-full max-w-full gap-0.5 overflow-x-auto rounded-md p-1 md:inline-flex md:w-auto md:gap-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={(e) => {
            if (o.value !== value)
              track(
                'tab_changed',
                { tabs: label, value: o.value, label: o.label },
                e.currentTarget,
              );
            onChange(o.value);
          }}
          className={`h-9 shrink-0 grow rounded-sm px-2 text-sm font-medium whitespace-nowrap transition-[color,background-color,scale] duration-150 ease-out active:scale-[0.97] md:grow-0 md:px-4 md:text-[15px] ${
            o.value === value
              ? 'bg-panel text-fg shadow-sm'
              : 'text-fg-3 hover:text-fg'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
