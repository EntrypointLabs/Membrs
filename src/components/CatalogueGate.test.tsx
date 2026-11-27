// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CATALOGUE_FAILED, RemoteGate } from './CatalogueGate';
import { keepServedListing } from '../lib/served';

afterEach(cleanup);

const loading = {
  status: 'loading' as const,
  data: undefined,
  retry: () => {},
};
const failed = { status: 'failed' as const, data: undefined, retry: () => {} };

describe('RemoteGate', () => {
  it('shows the screen shape while loading, never counts or the screen', () => {
    const html = renderToStaticMarkup(
      <RemoteGate route={{ page: 'home' }} remote={loading}>
        {() => <p>screen</p>}
      </RemoteGate>,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).not.toContain('screen');
    expect(html).not.toMatch(/>0</);
  });

  it('shows one failure message with a Retry that loads again', () => {
    const retry = vi.fn();
    const view = render(
      <RemoteGate route={{ page: 'home' }} remote={{ ...failed, retry }}>
        {() => <p>screen</p>}
      </RemoteGate>,
    );
    expect(view.getAllByRole('alert')).toHaveLength(1);
    expect(view.getByRole('alert').textContent).toContain(CATALOGUE_FAILED);
    expect(view.queryByText('screen')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('keeps the served title of a listing page when the API is down', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<main><h1>Jazz Night</h1><p>Live jazz on the island.</p></main>';
    keepServedListing(root, '/listing/jazz-night');
    const html = renderToStaticMarkup(
      <RemoteGate route={{ page: 'listing', id: 'jazz-night' }} remote={failed}>
        {() => <p>screen</p>}
      </RemoteGate>,
    );
    expect(html).toContain('Jazz Night');
    expect(html).toContain('Live jazz on the island.');
    expect(html).toContain('Retry');
    expect(html).not.toContain(CATALOGUE_FAILED);

    const other = renderToStaticMarkup(
      <RemoteGate
        route={{ page: 'listing', id: 'something-else' }}
        remote={failed}
      >
        {() => <p>screen</p>}
      </RemoteGate>,
    );
    expect(other).toContain(CATALOGUE_FAILED);
  });

  it('renders the screen with its data once it is in', () => {
    const html = renderToStaticMarkup(
      <RemoteGate
        route={{ page: 'home' }}
        remote={{ status: 'ready', data: 'loaded', retry: () => {} }}
      >
        {(data) => <p>{data}</p>}
      </RemoteGate>,
    );
    expect(html).toBe('<p>loaded</p>');
  });
});
