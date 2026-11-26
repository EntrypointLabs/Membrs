export const SITE_NAME = 'MEMBRS';

export const SITE_ORIGIN = 'https://membrs.xyz';

export const SITE_DESCRIPTION =
  'Events and opportunities worth your time: gigs, meetups, grants, fellowships and jobs, updated every day.';

const DESCRIPTION_LIMIT = 160;

const ROOT = '<div id="root"></div>';

export interface PageMeta {
  title: string;
  description: string;
  path: string;
  indexable: boolean;
}

export interface MetaTag {
  attribute: 'name' | 'property';
  key: string;
  content: string;
}

export interface PageHead {
  meta: PageMeta;
  extraTags?: MetaTag[];
  structuredData?: object[];
  canonical?: boolean;
}

export function clipped(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= DESCRIPTION_LIMIT) return flat;
  const cut = flat.slice(0, DESCRIPTION_LIMIT - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:.]$/, '')}…`;
}

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function metaTag(
  attribute: MetaTag['attribute'],
  key: string,
  content: string,
): MetaTag {
  return { attribute, key, content };
}

export function metaTags(meta: PageMeta): MetaTag[] {
  const url = absoluteUrl(meta.path);
  return [
    metaTag('name', 'description', meta.description),
    metaTag('name', 'robots', meta.indexable ? 'index, follow' : 'noindex'),
    metaTag('property', 'og:title', meta.title),
    metaTag('property', 'og:description', meta.description),
    metaTag('property', 'og:url', url),
    metaTag('name', 'twitter:title', meta.title),
    metaTag('name', 'twitter:description', meta.description),
  ];
}

function jsonLd(data: object): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function headTags(head: PageHead, tags: MetaTag[]): string {
  return [
    `<title>${escapeHtml(head.meta.title)}</title>`,
    ...tags.map(
      ({ attribute, key, content }) =>
        `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`,
    ),
    ...(head.canonical === false
      ? []
      : [
          `<link rel="canonical" href="${escapeHtml(absoluteUrl(head.meta.path))}" />`,
        ]),
    ...(head.structuredData ?? []).map(jsonLd),
  ].join('\n    ');
}

function withoutTags(template: string, keys: string[]): string {
  return template
    .replace(/\s*<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/, '')
    .replace(/\s*<meta\s+(name|property)="([^"]+)"[^>]*>/g, (tag, _, key) =>
      keys.includes(key) ? '' : tag,
    );
}

export function renderShell(
  template: string,
  head: PageHead,
  root: string,
): string {
  if (!template.includes(ROOT) || !template.includes('</head>')) {
    throw new Error('Template has no empty #root or </head>');
  }
  const tags = [...metaTags(head.meta), ...(head.extraTags ?? [])];
  return withoutTags(
    template,
    tags.map(({ key }) => key),
  )
    .replace('</head>', () => `  ${headTags(head, tags)}\n  </head>`)
    .replace(ROOT, () => `<div id="root">${root}</div>`);
}
