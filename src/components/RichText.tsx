import { Fragment, type ReactNode } from 'react';
import { openOverlay } from '../lib/ui';
import { Link } from './Link';

/**
 * Renders the small markup the legal copy uses: <b> and <a href>. It is a
 * tokenizer for exactly those two tags, not an HTML parser, and anything else
 * comes out as plain text, so fixture copy can never inject markup.
 */
export function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const pattern = /<b>(.*?)<\/b>|<a href="([^"]+)"[^>]*>(.*?)<\/a>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <b key={key++} className="text-fg font-semibold">
          {match[1]}
        </b>,
      );
    } else if (match[0].includes('data-cc')) {
      // The "Cookie settings" link in the policies opens the settings, not a page.
      nodes.push(
        <button
          key={key++}
          type="button"
          onClick={() => openOverlay('cookies')}
          className="text-brand dark:text-accent font-semibold hover:underline"
        >
          {match[3]}
        </button>,
      );
    } else {
      const href = toPath(match[2] ?? '');
      nodes.push(
        <Link
          key={key++}
          href={href}
          className="text-brand dark:text-accent font-semibold hover:underline"
        >
          {match[3]}
        </Link>,
      );
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <Fragment>{nodes}</Fragment>;
}

/** The prototype linked with #hash routes; the app uses real paths. */
function toPath(href: string): string {
  if (href.startsWith('#')) {
    const target = href.slice(1);
    return target === 'organisers' ? '/contribute' : `/${target}`;
  }
  return href;
}
