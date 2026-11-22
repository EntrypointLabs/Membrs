import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export function ScrollMore({ more }: { more: (() => void) | null }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = end.current;
    if (!node || !more) return;
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) more();
      },
      { rootMargin: '600px 0px' },
    );
    watcher.observe(node);
    return () => watcher.disconnect();
  }, [more]);
  if (!more) return null;
  return (
    <div ref={end} className="grid place-items-center py-10" aria-hidden="true">
      <Icon name="loader" className="text-fg-3 h-5 w-5 animate-spin" />
    </div>
  );
}
