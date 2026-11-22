// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MostPopular } from '../components/MostPopular';
import { eventListing } from '../lib/testing';
import { CategoryTiles } from './CategoriesScreen';
import { HomeScreen } from './HomeScreen';

describe('home with a loaded but empty catalogue', () => {
  let html = '';
  beforeAll(() => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    html = renderToStaticMarkup(<HomeScreen />);
    vi.unstubAllGlobals();
  });

  it('shows no zero counts', () => {
    expect(html).not.toMatch(/>0</);
    expect(html).not.toMatch(/\b0 (events|opportunities|openings)\b/);
  });

  it('hides the hero, Most Popular and the shelves', () => {
    expect(html).not.toContain('Most Popular');
    expect(html).not.toContain('aspect-[16/10]');
    expect(html).not.toContain('Just Added');
  });

  it('says there is nothing listed instead', () => {
    expect(html).toContain('Nothing here yet.');
  });
});

describe('CategoryTiles', () => {
  it('leaves the count off a category with nothing in it', () => {
    const html = renderToStaticMarkup(<CategoryTiles kind="event" />);
    expect(html).not.toMatch(/\b0 events?\b/);
  });
});

describe('MostPopular', () => {
  it('renders nothing for an empty list', () => {
    expect(renderToStaticMarkup(<MostPopular items={[]} />)).toBe('');
  });

  it('keeps a short list at least as tall as its title', () => {
    const html = renderToStaticMarkup(
      <MostPopular items={[eventListing({ id: 'only' })]} />,
    );
    expect(html).toContain('Most Popular');
    expect(html).toMatch(/md:min-h-\[calc\(clamp\(64px,5\.2vw,92px\)\*/);
  });
});
