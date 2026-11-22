// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function gate() {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE', 'http://api.test/api');
  const api = await import('../lib/api');
  const served = await import('../lib/served');
  const { CatalogueGate, CATALOGUE_FAILED } = await import('./CatalogueGate');
  return { api, served, CatalogueGate, CATALOGUE_FAILED };
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('CatalogueGate', () => {
  it('shows the screen shape while loading, never counts or the screen', async () => {
    const { CatalogueGate } = await gate();
    const html = renderToStaticMarkup(
      <CatalogueGate route={{ page: 'home' }}>
        <p>screen</p>
      </CatalogueGate>,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).not.toContain('screen');
    expect(html).not.toMatch(/>0</);
  });

  it('shows one failure message with a Retry that loads again', async () => {
    const { api, CatalogueGate, CATALOGUE_FAILED } = await gate();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await api.loadCatalogue(new Date(), []);
    const view = render(
      <CatalogueGate route={{ page: 'home' }}>
        <p>screen</p>
      </CatalogueGate>,
    );
    expect(view.getAllByRole('alert')).toHaveLength(1);
    expect(view.getByRole('alert').textContent).toContain(CATALOGUE_FAILED);
    expect(view.queryByText('screen')).toBeNull();

    const fetch = vi.fn(() =>
      Promise.resolve(new Response('[]', { status: 200 })),
    );
    vi.stubGlobal('fetch', fetch);
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'Retry' }));
      await api.loadCatalogue();
    });
    expect(fetch).toHaveBeenCalled();
    expect(view.getByText('screen')).toBeTruthy();
  });

  it('keeps the served title of a listing page when the API is down', async () => {
    const { api, served, CatalogueGate, CATALOGUE_FAILED } = await gate();
    const root = document.createElement('div');
    root.innerHTML =
      '<main><h1>Jazz Night</h1><p>Live jazz on the island.</p></main>';
    served.keepServedListing(root, '/listing/jazz-night');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}', { status: 503 }))),
    );
    await api.loadCatalogue(new Date(), []);
    const html = renderToStaticMarkup(
      <CatalogueGate route={{ page: 'listing', id: 'jazz-night' }}>
        <p>screen</p>
      </CatalogueGate>,
    );
    expect(html).toContain('Jazz Night');
    expect(html).toContain('Live jazz on the island.');
    expect(html).toContain('Retry');
    expect(html).not.toContain(CATALOGUE_FAILED);

    const other = renderToStaticMarkup(
      <CatalogueGate route={{ page: 'listing', id: 'something-else' }}>
        <p>screen</p>
      </CatalogueGate>,
    );
    expect(other).toContain(CATALOGUE_FAILED);
  });

  it('renders the screen once the catalogue is ready', async () => {
    const { api, CatalogueGate } = await gate();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('[]', { status: 200 }))),
    );
    await api.loadCatalogue();
    const html = renderToStaticMarkup(
      <CatalogueGate route={{ page: 'home' }}>
        <p>screen</p>
      </CatalogueGate>,
    );
    expect(html).toBe('<p>screen</p>');
  });
});
