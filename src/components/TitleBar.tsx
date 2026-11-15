import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/**
 * The page title bar every list page shares. On phones it stays pinned to the
 * top with the same space above and below; `desktop` keeps it on wider
 * screens too, as a plain heading.
 */
export function TitleBar({
  children,
  desktop = false,
  className,
}: {
  children: ReactNode;
  desktop?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-bg sticky top-0 z-30 -mx-4 px-4 pt-[calc(12px+env(safe-area-inset-top,0px))] pb-3',
        desktop ? 'md:static md:mx-0 md:p-0' : 'md:hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}
