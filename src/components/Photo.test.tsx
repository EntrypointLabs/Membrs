import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

async function renderPhoto(
  apiBase: string,
  props: { size?: 'card' | 'hero' | 'thumb' | 'wide'; priority?: boolean },
) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE', apiBase);
  const { Photo } = await import('./Photo');
  return renderToStaticMarkup(
    <Photo
      id="remote"
      alt="A night market"
      src="https://cdn.example.org/flyer.jpg"
      {...props}
    />,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Photo', () => {
  it('asks for the card-sized image at 1x and 2x, lazily, with its size set', async () => {
    const html = await renderPhoto('/api', { size: 'card' });
    expect(html).toContain(
      'src="/api/v1/img?u=https%3A%2F%2Fcdn.example.org%2Fflyer.jpg&amp;w=440&amp;h=330&amp;fit=cover"',
    );
    expect(html).toContain('w=880&amp;h=660&amp;fit=cover 2x');
    expect(html).toContain('width="440"');
    expect(html).toContain('height="330"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  it('loads the hero eagerly', async () => {
    const html = await renderPhoto('/api', { size: 'hero', priority: true });
    expect(html).toContain('w=960&amp;h=600');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchPriority="high"');
  });

  it('keeps the original image where no resized size is offered or there is no API', async () => {
    expect(await renderPhoto('/api', { size: 'wide' })).toContain(
      'src="https://cdn.example.org/flyer.jpg"',
    );
    expect(await renderPhoto('', { size: 'card' })).toContain(
      'src="https://cdn.example.org/flyer.jpg"',
    );
  });
});
