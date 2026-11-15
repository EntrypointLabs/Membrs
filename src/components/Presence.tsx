import { useEffect, useState, type ReactNode } from 'react';
import { EXIT_MS } from '../lib/motion';

export function Presence<T>({
  value,
  children,
}: {
  value: T | null | false;
  children: (value: T) => ReactNode;
}) {
  const [last, setLast] = useState<T | null>(value || null);
  if (value && value !== last) setLast(value);

  useEffect(() => {
    if (value || last === null) return;
    const timer = setTimeout(() => setLast(null), EXIT_MS);
    return () => clearTimeout(timer);
  }, [value, last]);

  if (last === null) return null;
  const leaving = !value;
  return (
    <div
      data-leaving={leaving}
      className={`group/presence contents ${leaving ? 'pointer-events-none' : ''}`}
    >
      {children(last)}
    </div>
  );
}
