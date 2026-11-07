import type { CSSProperties } from 'react';
import { CATEGORY_COLORS } from '../lib/palette';

/** Inline style that hands a category's two colours to .cat-color / .cat-bg. */
export function categoryStyle(name: string): CSSProperties {
  const pair = CATEGORY_COLORS[name];
  if (!pair) return {};
  return { '--c': pair[0], '--cd': pair[1] } as CSSProperties;
}

interface CategoryLabelProps {
  name: string;
  /** A small dot before the name, as feeds show it. */
  dot?: boolean;
  className?: string;
}

export function CategoryLabel({
  name,
  dot = false,
  className = '',
}: CategoryLabelProps) {
  return (
    <span
      className={`cat-color inline-flex items-center gap-1.5 ${className}`}
      style={categoryStyle(name)}
    >
      {dot && <i className="cat-bg inline-block h-1.5 w-1.5 rounded-full" />}
      {name}
    </span>
  );
}
