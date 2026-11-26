import { MEMBRS_LOGO } from '../lib/askTools';
import { cn } from '../lib/utils';

export function MembrsMark({ className }: { className?: string }) {
  return (
    <img
      src={MEMBRS_LOGO}
      alt=""
      aria-hidden="true"
      className={cn('block shrink-0', className)}
    />
  );
}
