import type { ReactNode } from 'react';

const SWIPE =
  'no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 *:w-[44vw] *:shrink-0 *:snap-start';
const STACK = 'grid grid-cols-2 gap-x-3 gap-y-8';
const WEB =
  'md:mx-0 md:grid md:grid-cols-4 md:gap-x-8 md:gap-y-16 md:overflow-visible md:px-0 md:*:w-auto';

export function Rail({
  children,
  swipe = false,
}: {
  children: ReactNode;
  swipe?: boolean;
}) {
  return <div className={`${swipe ? SWIPE : STACK} ${WEB}`}>{children}</div>;
}
