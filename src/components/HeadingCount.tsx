export function HeadingCount({ count }: { count: number }) {
  return (
    <em className="text-fg-3 ml-2 align-baseline text-sm font-medium tracking-normal not-italic tabular-nums md:text-lg">
      {count}
    </em>
  );
}
