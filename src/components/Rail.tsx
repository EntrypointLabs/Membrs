import type { ReactNode } from 'react';

/**
 * A row of cards: a swipeable rail on phones, a three-column grid on web.
 * Cards keep a fixed width on the rail so the next one peeks in from the
 * edge and says "there is more".
 */
export function Rail({
  children,
  columns = 3,
}: {
  children: ReactNode;
  columns?: 3 | 4;
}) {
  return (
    <div
      className={`no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 *:w-[44vw] *:shrink-0 *:snap-start md:mx-0 md:grid md:gap-x-8 md:gap-y-16 md:overflow-visible md:px-0 md:*:w-auto ${
        columns === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'
      }`}
    >
      {children}
    </div>
  );
}
