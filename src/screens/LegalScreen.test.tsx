import { describe, expect, it } from 'vitest';
import { prerender } from 'react-dom/static';
import { LegalScreen } from './LegalScreen';

/** The legal text loads on demand, so render the way the server would: wait for it. */
async function render(node: React.ReactNode): Promise<string> {
  const { prelude } = await prerender(node);
  return new Response(prelude).text();
}

describe('LegalScreen', () => {
  it.each([
    'terms',
    'privacy',
    'cookies',
    'guidelines',
    'advertising',
  ] as const)(
    'renders %s with numbered clauses and every document as a tab',
    async (doc) => {
      const html = await render(<LegalScreen doc={doc} />);
      expect(html).toContain('Last updated');
      expect(html).toContain('>1.<');
      expect(html).toContain('>1.1<');
      expect(html.match(/role="tab"/g)).toHaveLength(5);
    },
  );

  it.each(['terms', 'privacy'] as const)(
    'letters the items of a list clause in %s',
    async (doc) => {
      const html = await render(<LegalScreen doc={doc} />);
      expect(html).toContain('>(a)<');
    },
  );
});
