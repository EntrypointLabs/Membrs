import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HOME_LIST } from '../components/PhoneList';
import { eventListing } from '../lib/testing';
import type { Section } from '../lib/types';
import { LocalShelves } from './HomeShelves';

const nearby: Section = {
  id: 'nearby',
  title: 'Near You',
  about: 'Lagos',
  total: 8,
  items: Array.from({ length: 8 }, (_, i) =>
    eventListing({ id: `e${i}`, title: `Event e${i}`, inDays: 3 }),
  ),
};

const pathOf = () => '/v1/listings/home?section=nearby';

function phoneSection(html: string): string {
  const start = html.indexOf('<section class="mt-12 md:hidden"');
  return html.slice(start, html.indexOf('</section>', start));
}

describe('LocalShelves', () => {
  it('lists one listing per row on phones, capped like the other phone sections', () => {
    const phone = phoneSection(
      renderToStaticMarkup(<LocalShelves shelves={[nearby]} pathOf={pathOf} />),
    );
    expect(phone).toContain('Event e0');
    expect(phone).toContain(`Event e${HOME_LIST - 1}`);
    expect(phone).not.toContain(`Event e${HOME_LIST}`);
  });

  it('counts the whole shelf, not just the page it was sent', () => {
    const html = renderToStaticMarkup(
      <LocalShelves shelves={[{ ...nearby, total: 40 }]} pathOf={pathOf} />,
    );
    expect(phoneSection(html)).toContain('40');
  });

  it('puts the place on the right of the heading, not under the title', () => {
    const html = renderToStaticMarkup(
      <LocalShelves shelves={[nearby]} pathOf={pathOf} />,
    );
    const phoneHead = phoneSection(html).split('</header>')[0];
    expect(phoneHead).toMatch(/<\/h2><span[^>]*>Lagos<\/span>/);
    expect(html).not.toMatch(/<p[^>]*>Lagos<\/p>/);
    expect(html).toMatch(
      /max-md:hidden[\s\S]*<span class="text-fg-3 text-base">Lagos<\/span>/,
    );
  });
});
