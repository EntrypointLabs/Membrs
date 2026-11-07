import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LegalScreen } from './LegalScreen';

describe('LegalScreen', () => {
  it.each([
    'terms',
    'privacy',
    'cookies',
    'guidelines',
    'advertising',
  ] as const)(
    'renders %s with numbered sections and every document as a tab',
    (doc) => {
      const html = renderToStaticMarkup(<LegalScreen doc={doc} />);
      expect(html).toContain('Last updated');
      expect(html).toContain('>01<');
      expect(html.match(/role="tab"/g)).toHaveLength(5);
    },
  );
});
