import { categories, categoryBySlug } from './api';
import { CONTRIBUTE_KINDS } from './contribute';
import { paths, type FeedKind, type Route } from './router';
import { shown } from './sections';
import { escapeHtml, renderShell, SITE_NAME, SITE_ORIGIN } from './head';
import {
  absoluteUrl,
  feedOf,
  pageMeta,
  shortTitle,
  SITE_DESCRIPTION,
} from './seo';
import { LEGAL_TITLES } from './title';
import type { LegalSlug } from './types';

export interface PrerenderedPage {
  file: string;
  html: string;
}

function feeds(): FeedKind[] {
  return [...new Set(categories().map((c) => feedOf(c.kind)))].filter(shown);
}

function feedCategories(feed: FeedKind): Route[] {
  return categories()
    .filter((c) => feedOf(c.kind) === feed)
    .map((c) => ({ page: 'category', slug: c.slug }));
}

function sectionRoutes(): Route[] {
  return [
    ...feeds().map((feed): Route => ({ page: 'feed', feed })),
    ...feeds().map((feed): Route => ({ page: 'categories', feed })),
  ];
}

function contributeRoutes(): Route[] {
  return CONTRIBUTE_KINDS.map(({ value }) => ({
    page: 'contribute',
    kind: value,
  }));
}

function legalRoutes(): Route[] {
  return (Object.keys(LEGAL_TITLES) as LegalSlug[]).map((doc) => ({
    page: 'legal',
    doc,
  }));
}

export function prerenderRoutes(): Route[] {
  const all: Route[] = [
    { page: 'home' },
    ...sectionRoutes(),
    ...feeds().flatMap(feedCategories),
    ...contributeRoutes(),
    ...legalRoutes(),
  ];
  return all.filter((route) => {
    const meta = pageMeta(route);
    return meta.indexable && !meta.path.includes('?');
  });
}

export function outputFile(path: string): string {
  return path === '/' ? 'index.html' : `${path.slice(1)}/index.html`;
}

export function breadcrumbTrail(route: Route): Route[] {
  const home: Route = { page: 'home' };
  switch (route.page) {
    case 'home':
      return [home];
    case 'feed':
      return [home, route];
    case 'categories':
      return [home, { page: 'feed', feed: route.feed }, route];
    case 'category': {
      const category = categoryBySlug(route.slug);
      if (!category) return [home, route];
      const feed = feedOf(category.kind);
      return [
        home,
        { page: 'feed', feed },
        { page: 'categories', feed },
        route,
      ];
    }
    default:
      return [home, route];
  }
}

function nameOf(route: Route): string {
  return shortTitle(pageMeta(route).title);
}

function link(route: Route): string {
  const meta = pageMeta(route);
  return `<a href="${escapeHtml(meta.path)}">${escapeHtml(shortTitle(meta.title))}</a>`;
}

function linkList(label: string, routes: Route[]): string {
  const items = routes.map((route) => `<li>${link(route)}</li>`).join('');
  return `<nav aria-label="${escapeHtml(label)}"><ul>${items}</ul></nav>`;
}

function categorySection(feed: FeedKind): string {
  const heading = nameOf({ page: 'categories', feed });
  return `<section><h2>${escapeHtml(heading)}</h2>${linkList(heading, feedCategories(feed))}</section>`;
}

export function rootContent(route: Route): string {
  const meta = pageMeta(route);
  const trail = breadcrumbTrail(route);
  return [
    '<main>',
    trail.length > 1 ? linkList('Breadcrumb', trail.slice(0, -1)) : '',
    `<h1>${escapeHtml(nameOf(route))}</h1>`,
    `<p>${escapeHtml(meta.description)}</p>`,
    linkList('Sections', [
      { page: 'home' },
      ...sectionRoutes(),
      ...contributeRoutes(),
    ]),
    ...feeds().map(categorySection),
    linkList('Legal', legalRoutes()),
    '</main>',
  ].join('');
}

function homeGraph(): object[] {
  const url = absoluteUrl(paths.home());
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: nameOf({ page: 'home' }),
      url,
      description: SITE_DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${absoluteUrl(paths.search())}?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: nameOf({ page: 'home' }),
      url,
      logo: absoluteUrl('/favicon.svg'),
    },
  ];
}

function breadcrumbGraph(route: Route): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbTrail(route).map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: nameOf(crumb),
      item: absoluteUrl(pageMeta(crumb).path),
    })),
  };
}

export function structuredData(route: Route): object[] {
  return route.page === 'home' ? homeGraph() : [breadcrumbGraph(route)];
}

export function renderPage(template: string, route: Route): string {
  return renderShell(
    template,
    { meta: pageMeta(route), structuredData: structuredData(route) },
    rootContent(route),
  );
}

export function prerenderPages(template: string): PrerenderedPage[] {
  return prerenderRoutes().map((route) => ({
    file: outputFile(pageMeta(route).path),
    html: renderPage(template, route),
  }));
}

/**
 * What the server needs to render listing pages and the sitemap without
 * repeating the site's name, origin or page list: it reads this file from the
 * build output at start-up.
 */
export interface SiteManifest {
  name: string;
  origin: string;
  description: string;
  pages: string[];
}

export function siteManifest(): SiteManifest {
  return {
    name: SITE_NAME,
    origin: SITE_ORIGIN,
    description: SITE_DESCRIPTION,
    pages: prerenderRoutes().map((route) => pageMeta(route).path),
  };
}
