import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { View } from '../lib/views';
import { FeedBody } from './FeedLayout';

const all: View<number> = { id: 'tonight', label: 'Tonight', test: () => true };

describe('FeedBody', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('links a long group to its own view with a real href', () => {
    const items = Array.from({ length: 15 }, (_, i) => i);
    const html = renderToStaticMarkup(
      <FeedBody
        items={items}
        views={[all]}
        filtered={false}
        noun={['event', 'events']}
        keyOf={String}
        row={(i) => <span>{i}</span>}
        rails={[{ title: 'Happening Soon', items: [] }]}
        card={(i) => <span key={i}>{i}</span>}
      />,
    );
    expect(html).toMatch(/<a [^>]*href="\/\?view=tonight"[^>]*>3 /);
  });
});
