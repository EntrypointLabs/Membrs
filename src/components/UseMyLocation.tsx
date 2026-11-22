import { useState } from 'react';
import { shareLocation } from '../lib/location';
import { Icon } from './Icon';

export function UseMyLocation({
  className = '',
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const [locating, setLocating] = useState(false);
  const locate = () => {
    setLocating(true);
    void shareLocation().finally(() => setLocating(false));
  };
  return (
    <button
      type="button"
      onClick={locate}
      disabled={locating}
      aria-label={iconOnly ? 'Use my location' : undefined}
      className={`inline-flex shrink-0 items-center justify-center gap-2 disabled:opacity-60 ${className}`}
    >
      <Icon
        name={locating ? 'loader' : 'pin'}
        className={`h-4 w-4 ${locating ? 'animate-spin' : ''}`}
      />
      {!iconOnly && 'Use my location'}
    </button>
  );
}
