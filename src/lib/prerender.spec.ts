import { describe, expect, it } from 'vitest';
import { categories } from './api';
import {
  breadcrumbTrail,
  outputFile,
  prerenderPages,
  prerenderRoutes,
  renderPage,
  siteManifest,
  structuredData,
} from './prerender';
import { paths } from './router';
import { absoluteUrl, pageMeta } from './seo';

const TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta
      name="description"
      content="old"
    />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="old" />
    <meta name="twitter:description" content="old" />
    <title>MEMBRS</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe('prerenderRoutes', () => {
  const routePaths = prerenderRoutes().map((r) => pageMeta(r).path);

  it('covers the fixed sections and legal pages', () => {
    expect(routePaths).toEqual(
      expect.arrayContaining([
        '/',
        '/events',
        '/opportunities',
        '/events/categories',
        '/opportunities/categories',
        '/contribute',
        '/terms',
        '/privacy',
      ]),
    );
  });

  it('covers every event and opportunity category', () => {
    const slugs = categories()
      .filter((c) => c.kind === 'event' || c.kind === 'opportunity')
      .map((c) => paths.category(c.slug));
    expect(routePaths).toEqual(expect.arrayContaining(slugs));
  });

  it('skips query paths, hidden sections and duplicates', () => {
    expect(routePaths.some((p) => p.includes('?'))).toBe(false);
    expect(routePaths).not.toContain('/places');
    expect(new Set(routePaths).size).toBe(routePaths.length);
  });
});

describe('outputFile', () => {
  it('maps a clean path to a directory index', () => {
    expect(outputFile('/')).toBe('index.html');
    expect(outputFile('/events/categories')).toBe(
      'events/categories/index.html',
    );
  });
});

describe('renderPage', () => {
  const html = renderPage(TEMPLATE, { page: 'feed', feed: 'events' });
  const meta = pageMeta({ page: 'feed', feed: 'events' });

  it('replaces the head tags with the page meta', () => {
    expect(html).toContain(`<title>${meta.title}</title>`);
    expect(html).toContain(
      `<link rel="canonical" href="${absoluteUrl('/events')}" />`,
    );
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain(
      `<meta property="og:url" content="${absoluteUrl('/events')}" />`,
    );
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).not.toContain('content="old"');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
  });

  it('fills #root with one h1 and real links', () => {
    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain('<h1>Events</h1>');
    expect(html).toContain('<a href="/opportunities/categories">');
    expect(html).toContain('<a href="/category/music">');
  });

  it('escapes text', () => {
    expect(html).toContain('Art &amp; Design');
  });

  it('rejects a template without an empty root', () => {
    expect(() => renderPage('<html></html>', { page: 'home' })).toThrow();
  });
});

describe('structuredData', () => {
  it('describes the site and organisation on home', () => {
    const types = structuredData({ page: 'home' }).map(
      (d) => (d as { '@type': string })['@type'],
    );
    expect(types).toEqual(['WebSite', 'Organization']);
    expect(JSON.stringify(structuredData({ page: 'home' }))).toContain(
      'https://membrs.xyz/search?q={search_term_string}',
    );
  });

  it('builds breadcrumbs from home down to a category', () => {
    const trail = breadcrumbTrail({ page: 'category', slug: 'music' }).map(
      (r) => pageMeta(r).path,
    );
    expect(trail).toEqual([
      '/',
      '/events',
      '/events/categories',
      '/category/music',
    ]);
    const [list] = structuredData({ page: 'category', slug: 'music' });
    expect(list).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, item: 'https://membrs.xyz/' },
        { position: 2, item: 'https://membrs.xyz/events' },
        { position: 3, item: 'https://membrs.xyz/events/categories' },
        {
          position: 4,
          name: 'Music',
          item: 'https://membrs.xyz/category/music',
        },
      ],
    });
  });
});

describe('prerenderPages', () => {
  it('renders one file per route', () => {
    const pages = prerenderPages(TEMPLATE);
    expect(pages.map((p) => p.file)).toContain('events/index.html');
    expect(pages).toHaveLength(prerenderRoutes().length);
  });
});

describe('siteManifest', () => {
  it('lists every prerendered page once, with no query strings', () => {
    const { pages, origin, name } = siteManifest();
    expect(origin).toBe('https://membrs.xyz');
    expect(name).toBe('MEMBRS');
    expect(pages).toEqual(
      expect.arrayContaining([
        '/',
        '/events',
        '/opportunities/categories',
        '/contribute',
        '/terms',
      ]),
    );
    expect(pages).not.toContain('/places');
    expect(new Set(pages).size).toBe(pages.length);
    expect(pages.some((path) => path.includes('?'))).toBe(false);
  });
});
