import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { paths } from '../lib/router';
import { LEGAL_TITLES } from '../lib/title';
import type { LegalSlug } from '../lib/types';
import { FeedSearch } from './FeedSearch';
import { Footer } from './Footer';
import { Header } from './Header';
import { MobileTabBar } from './MobileTabBar';
import { NAV } from './nav';
import { PageTitle } from './PageTitle';

const hrefs = (html: string) =>
  [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);

describe('Header', () => {
  it('links every section, Contribute included, with a real href', () => {
    const links = hrefs(renderToStaticMarkup(<Header />));
    for (const item of NAV) expect(links).toContain(item.href);
    expect(links).toContain(paths.contribute());
  });

  it('keeps the search button on the web', () => {
    expect(hrefs(renderToStaticMarkup(<Header />))).toContain(paths.search());
  });
});

describe('MobileTabBar', () => {
  it('links Home, Events and Opportunities and opens Ask membrs', () => {
    const html = renderToStaticMarkup(<MobileTabBar />);
    expect(hrefs(html)).toEqual([
      paths.home(),
      paths.feed('events'),
      paths.feed('opportunities'),
    ]);
    expect(html).toContain('aria-label="Ask membrs"');
  });
});

describe('FeedSearch', () => {
  it('opens search and leaves Ask to the tab bar', () => {
    const html = renderToStaticMarkup(<FeedSearch />);
    expect(hrefs(html)).toEqual([paths.search()]);
    expect(html).not.toContain('aria-label="Ask membrs"');
  });
});

describe('Footer', () => {
  it('links the main sections, both category indexes and the legal pages', () => {
    const links = hrefs(renderToStaticMarkup(<Footer />));
    expect(links).toEqual(
      expect.arrayContaining([
        paths.home(),
        paths.feed('events'),
        paths.feed('opportunities'),
        paths.categories('events'),
        paths.categories('opportunities'),
        paths.contribute(),
        ...(Object.keys(LEGAL_TITLES) as LegalSlug[]).map(paths.legal),
      ]),
    );
  });
});

describe('PageTitle', () => {
  it('keeps a space between the section and the current name', () => {
    const html = renderToStaticMarkup(
      <PageTitle section="Events" current="Categories" />,
    );
    const text = html.replace(/<[^>]+>/g, '');
    expect(text).toBe('Events Categories');
  });
});
