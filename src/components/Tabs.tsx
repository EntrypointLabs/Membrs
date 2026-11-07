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
      className="bg-soft no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-md p-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`h-9 shrink-0 rounded-sm px-4 text-[15px] font-medium whitespace-nowrap transition-colors ${
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
