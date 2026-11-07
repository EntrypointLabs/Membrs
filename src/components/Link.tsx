import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from '../lib/router';
import { preloadPath } from '../screens/lazy';

/**
 * An anchor that routes in-app without a reload. External links, new-tab
 * clicks and modified clicks fall through to the browser as normal.
 */
export function Link({
  href = '/',
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      rest.target === '_blank' ||
      !href.startsWith('/')
    ) {
      return;
    }
    e.preventDefault();
    navigate(href);
  };
  // Start loading the next screen's code on hover or touch, before the click.
  const warm = () => href.startsWith('/') && preloadPath(href);
  return (
    <a
      href={href}
      onClick={handle}
      onMouseEnter={warm}
      onTouchStart={warm}
      onFocus={warm}
      {...rest}
    />
  );
}
